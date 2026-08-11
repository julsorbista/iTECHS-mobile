const { successResponse, errorResponse, getPaginationData, sanitizeUser, generateExamCode } = require('../utils/helpers');
const { GAME_ORDER_INDEX } = require('../config/gameCatalog');
const prisma = require('../lib/prisma');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');
const { execFile } = require('child_process');
const { promisify } = require('util');
const {
  getTeacherLevelCanvas: getTeacherLevelCanvasData,
  saveTeacherLevelCanvas: saveTeacherLevelCanvasData,
} = require('../services/teacherLevelEditorService');
const {
  generatePerformanceInsightWithGemini,
} = require('../services/aiQuestionService');
const {
  MATERIAL_TYPE_LABELS,
  MATERIAL_INLINE_OPEN_MS,
  MODULE_ONLY_MIME_TYPE,
  DEFAULT_XP_REWARD,
  DEFAULT_COIN_REWARD,
  normalizeSectionLabel,
  normalizeCourseCodeLabel,
  buildStudentMaterialAudienceSections,
  cleanTextBlock,
  isModuleOnlyMaterial,
  buildStructuredOutlinePreviewText,
  createFallbackOutline,
  buildContentBasedQuizQuestions,
  normalizeOutline,
  flattenOutline,
  serializeAssessmentSummary,
  buildStudentMaterialCatalog,
  getStudentMaterialDetail,
  getStudentWithTeacher,
} = require('../services/learningMaterialService');

const execFileAsync = promisify(execFile);

const LEARNING_MATERIALS_DIRECTORY = path.resolve(__dirname, '../../uploads/learning-materials');
const LEARNING_MATERIAL_ASSETS_DIRECTORY = path.resolve(LEARNING_MATERIALS_DIRECTORY, 'assets');
const LEARNING_MATERIAL_ASSET_ROUTE = '/api/public/learning-material-assets';
const normalizeSectionKey = (value) => String(value ?? '').trim();

const getAssessmentStarRating = (percentage) => {
  const safePercentage = Number(percentage);

  if (!Number.isFinite(safePercentage) || safePercentage <= 0) {
    return 0;
  }

  if (safePercentage >= 85) {
    return 3;
  }

  if (safePercentage >= 70) {
    return 2;
  }

  if (safePercentage >= 50) {
    return 1;
  }

  return 0;
};

const getLatestTimestamp = (...values) => {
  const timestamps = values
    .flat()
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
};

const normalizeOptionalText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const detectLearningMaterialType = (file = {}) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    return 'PDF';
  }

  if (mimeType.startsWith('video/')) {
    return 'VIDEO';
  }

  if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(extension)) {
    return 'VIDEO';
  }

  if (
    mimeType === 'application/msword'
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || ['.doc', '.docx'].includes(extension)
  ) {
    return 'WORD';
  }

  if (
    mimeType === 'application/vnd.ms-powerpoint'
    || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    || ['.ppt', '.pptx'].includes(extension)
  ) {
    return 'POWERPOINT';
  }

  return null;
};

const parseModuleStructureJson = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeOutline(parsed) : null;
  } catch (error) {
    return null;
  }
};

const getLearningMaterialAssetPublicPath = (storedFileName) => (
  `${LEARNING_MATERIAL_ASSET_ROUTE}/${encodeURIComponent(storedFileName)}`
);

const getLearningMaterialAssetFileNameFromSource = (value) => {
  const source = String(value || '').trim();
  if (!source.startsWith(`${LEARNING_MATERIAL_ASSET_ROUTE}/`)) {
    return '';
  }

  const rawFileName = source.slice(LEARNING_MATERIAL_ASSET_ROUTE.length + 1).split('?')[0];
  try {
    return decodeURIComponent(rawFileName);
  } catch (error) {
    return rawFileName;
  }
};

const removeStoredLearningMaterialAssetFile = async (storedFileName) => {
  const normalizedName = String(storedFileName || '').trim();
  if (!normalizedName) {
    return;
  }

  const resolvedPath = path.resolve(LEARNING_MATERIAL_ASSETS_DIRECTORY, normalizedName);
  if (!resolvedPath.startsWith(LEARNING_MATERIAL_ASSETS_DIRECTORY)) {
    return;
  }

  try {
    await fs.unlink(resolvedPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const collectLearningMaterialAssetFileNames = (outlineJson = []) => {
  const fileNames = new Set();

  if (!Array.isArray(outlineJson)) {
    return fileNames;
  }

  outlineJson.forEach((section) => {
    const items = Array.isArray(section?.items) ? section.items : [];
    items.forEach((item) => {
      const mainMediaName = getLearningMaterialAssetFileNameFromSource(item?.media?.src || item?.media?.url);
      if (mainMediaName) {
        fileNames.add(mainMediaName);
      }

      const mainVideoName = getLearningMaterialAssetFileNameFromSource(item?.video?.src || item?.video?.url);
      if (mainVideoName) {
        fileNames.add(mainVideoName);
      }

      const subtopics = Array.isArray(item?.subtopics) ? item.subtopics : [];
      subtopics.forEach((subtopic) => {
        const subtopicMediaName = getLearningMaterialAssetFileNameFromSource(subtopic?.media?.src || subtopic?.media?.url);
        if (subtopicMediaName) {
          fileNames.add(subtopicMediaName);
        }
      });
    });
  });

  return fileNames;
};

const cleanupLearningMaterialAssets = async (outlineJson = [], excludedFileNames = new Set()) => {
  const assetFileNames = [...collectLearningMaterialAssetFileNames(outlineJson)]
    .filter((fileName) => !excludedFileNames.has(fileName));

  await Promise.all(assetFileNames.map((fileName) => removeStoredLearningMaterialAssetFile(fileName)));
};

const parseInlineImageDataUrl = (value) => {
  const source = String(value || '').trim();
  const match = source.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length) {
    return null;
  }

  const extensionByMimeType = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  const extension = extensionByMimeType[mimeType];
  if (!extension) {
    return null;
  }

  return {
    mimeType,
    extension,
    buffer,
  };
};

const createLearningMaterialAssetFile = async (assetData) => {
  await fs.mkdir(LEARNING_MATERIAL_ASSETS_DIRECTORY, { recursive: true });
  const storedFileName = `lesson-asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${assetData.extension}`;
  const absolutePath = path.resolve(LEARNING_MATERIAL_ASSETS_DIRECTORY, storedFileName);

  await fs.writeFile(absolutePath, assetData.buffer);

  return storedFileName;
};

const persistLessonMedia = async (media, createdAssetFileNames) => {
  if (!media || typeof media !== 'object') {
    return media ?? null;
  }

  const source = String(media.src || media.url || '').trim();
  if (!source) {
    return null;
  }

  const inlineImage = parseInlineImageDataUrl(source);
  if (!inlineImage) {
    return {
      ...media,
      src: source,
    };
  }

  const storedFileName = await createLearningMaterialAssetFile(inlineImage);
  createdAssetFileNames.push(storedFileName);

  return {
    ...media,
    src: getLearningMaterialAssetPublicPath(storedFileName),
  };
};

const persistModuleStructureMediaAssets = async (outlineJson = []) => {
  const createdAssetFileNames = [];

  const nextOutline = await Promise.all((Array.isArray(outlineJson) ? outlineJson : []).map(async (section) => ({
    ...section,
    items: await Promise.all((Array.isArray(section?.items) ? section.items : []).map(async (item) => ({
      ...item,
      media: await persistLessonMedia(item?.media, createdAssetFileNames),
      video: await persistLessonMedia(item?.video, createdAssetFileNames),
      subtopics: await Promise.all((Array.isArray(item?.subtopics) ? item.subtopics : []).map(async (subtopic) => ({
        ...subtopic,
        media: await persistLessonMedia(subtopic?.media, createdAssetFileNames),
      }))),
    }))),
  })));

  return {
    outlineJson: nextOutline,
    createdAssetFileNames,
  };
};

const createModulePlaceholderFile = async (title, outlineJson) => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 10);
  const storedFileName = `module-${timestamp}-${randomPart}.txt`;
  const previewText = buildStructuredOutlinePreviewText(outlineJson);
  const fileContent = JSON.stringify({
    title,
    previewText,
    outline: outlineJson,
  }, null, 2);
  const filePath = path.resolve(LEARNING_MATERIALS_DIRECTORY, storedFileName);

  await fs.writeFile(filePath, fileContent, 'utf8');

  return {
    storedFileName,
    originalFileName: `${String(title || 'module').trim() || 'module'}.module.json`,
    mimeType: MODULE_ONLY_MIME_TYPE,
    fileSize: Buffer.byteLength(fileContent, 'utf8'),
  };
};

const extractPdfPreviewText = async (filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return cleanTextBlock(parsed?.text || '').slice(0, 4000);
  } catch (error) {
    return '';
  }
};

const extractPdfPageLines = async (pageData) => {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: true,
    disableCombineTextItems: false,
  });

  const lines = [];
  let currentLine = [];
  let previousY = null;

  textContent.items.forEach((item) => {
    const value = cleanTextBlock(item?.str || '');
    if (!value) {
      return;
    }

    const y = Number(item?.transform?.[5] || 0);
    if (previousY !== null && Math.abs(y - previousY) > 2 && currentLine.length > 0) {
      lines.push(cleanTextBlock(currentLine.join(' ')));
      currentLine = [];
    }

    currentLine.push(value);
    previousY = y;
  });

  if (currentLine.length > 0) {
    lines.push(cleanTextBlock(currentLine.join(' ')));
  }

  return lines.filter(Boolean);
};

const buildPdfOutlineFromPages = ({
  title,
  subject,
  description,
  previewText,
  pages = [],
}) => {
  const fallbackOutline = createFallbackOutline(
    {
      title,
      subject,
      description,
      materialType: 'PDF',
      previewText,
    },
    previewText
  );
  const fallbackItems = flattenOutline(fallbackOutline, {
    title,
    subject,
    description,
    previewText,
  });

  const items = pages.map((page, index) => ({
    id: `pdf-page-${index + 1}`,
    title: fallbackItems[index]?.title || `Page ${index + 1}`,
    order: index,
    pageLabel: String(index + 1),
    pageNumber: index + 1,
  }));

  return [
    {
      id: 'pdf-pages',
      title: cleanTextBlock(subject || title || 'PDF Pages') || 'PDF Pages',
      items,
    },
  ];
};

const extractPdfArtifacts = async ({
  filePath,
  title,
  subject,
  description,
  materialType,
  originalFileName,
}) => {
  try {
    const buffer = await fs.readFile(filePath);
    const pages = [];
    const parsed = await pdfParse(buffer, {
      pagerender: async (pageData) => {
        const lines = await extractPdfPageLines(pageData);
        const text = cleanTextBlock(lines.join('\n'));
        pages.push({
          pageNumber: pages.length + 1,
          lines,
          text,
        });
        return text;
      },
    });

    const previewText = cleanTextBlock(parsed?.text || pages.map((page) => page.text).join('\n')).slice(0, 4000);
    const outlineJson = pages.length > 0
      ? buildPdfOutlineFromPages({
        title,
        subject,
        description,
        previewText,
        pages,
      })
      : createFallbackOutline(
        {
          title,
          subject,
          description,
          materialType,
          originalFileName,
          previewText,
        },
        previewText
      );

    return {
      previewText: previewText || null,
      outlineJson,
    };
  } catch (error) {
    const previewText = await extractPdfPreviewText(filePath);
    return {
      previewText: previewText || null,
      outlineJson: createFallbackOutline(
        {
          title,
          subject,
          description,
          materialType,
          originalFileName,
          previewText,
        },
        previewText
      ),
    };
  }
};

const stripOfficeXmlToText = (xmlSource = '') => cleanTextBlock(
  String(xmlSource || '')
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
);

const extractOfficePreviewText = async (filePath, xmlPathPatterns = []) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'itechs-material-'));

  try {
    await execFileAsync('tar', ['-xf', filePath, '-C', tempDirectory]);

    const xmlFiles = await fs.readdir(tempDirectory, { recursive: true });
    const matchingFiles = xmlFiles
      .filter((entry) => typeof entry === 'string')
      .filter((entry) => xmlPathPatterns.some((pattern) => entry.replace(/\\/g, '/').startsWith(pattern)))
      .sort((left, right) => left.localeCompare(right));

    const textParts = [];
    for (const relativeFile of matchingFiles) {
      const absoluteFile = path.join(tempDirectory, relativeFile);
      const xmlContent = await fs.readFile(absoluteFile, 'utf8');
      const textContent = stripOfficeXmlToText(xmlContent);
      if (textContent) {
        textParts.push(textContent);
      }
    }

    return cleanTextBlock(textParts.join('\n')).slice(0, 4000);
  } catch (error) {
    return '';
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
};

const extractOfficeTextBlocks = async (filePath, xmlPathPatterns = []) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'itechs-material-'));

  try {
    await execFileAsync('tar', ['-xf', filePath, '-C', tempDirectory]);

    const xmlFiles = await fs.readdir(tempDirectory, { recursive: true });
    const matchingFiles = xmlFiles
      .filter((entry) => typeof entry === 'string')
      .filter((entry) => xmlPathPatterns.some((pattern) => entry.replace(/\\/g, '/').startsWith(pattern)))
      .sort((left, right) => left.localeCompare(right));

    const blocks = [];
    for (const relativeFile of matchingFiles) {
      const absoluteFile = path.join(tempDirectory, relativeFile);
      const xmlContent = await fs.readFile(absoluteFile, 'utf8');
      const textContent = stripOfficeXmlToText(xmlContent);
      if (textContent) {
        blocks.push(textContent);
      }
    }

    return blocks;
  } catch (error) {
    return [];
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
};

const buildPowerPointOutlineFromSlides = ({
  title,
  subject,
  slides = [],
}) => {
  const normalizedSlides = slides
    .map((slideText) => cleanTextBlock(slideText))
    .filter(Boolean);

  if (normalizedSlides.length === 0) {
    return [];
  }

  return [
    {
      id: 'powerpoint-slides',
      title: cleanTextBlock(subject || title || 'Presentation Slides') || 'Presentation Slides',
      items: normalizedSlides.map((slideText, index) => {
        const firstLine = slideText.split('\n').find(Boolean) || '';
        const slideTitle = cleanTextBlock(firstLine).slice(0, 90) || `Slide ${index + 1}`;
        return {
          id: `slide-${index + 1}`,
          title: slideTitle,
          order: index,
          pageLabel: String(index + 1),
          pageNumber: index + 1,
        };
      }),
    },
  ];
};

const extractBinaryPreviewText = async (filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const latinText = buffer.toString('latin1');
    const matches = latinText.match(/[A-Za-z0-9][A-Za-z0-9 .,;:()\-_'"/&!?]{5,}/g) || [];
    const normalizedLines = matches
      .map((entry) => cleanTextBlock(entry))
      .filter((entry) => entry.length >= 8)
      .filter((entry, index, collection) => collection.indexOf(entry) === index)
      .slice(0, 120);

    return cleanTextBlock(normalizedLines.join('\n')).slice(0, 4000);
  } catch (error) {
    return '';
  }
};

const buildLearningMaterialArtifacts = async ({
  title,
  subject,
  description,
  materialType,
  originalFileName,
  storedFileName,
}) => {
  const filePath = path.resolve(LEARNING_MATERIALS_DIRECTORY, storedFileName);
  const extension = path.extname(String(originalFileName || storedFileName || '')).toLowerCase();
  if (materialType === 'PDF') {
    return extractPdfArtifacts({
      filePath,
      title,
      subject,
      description,
      materialType,
      originalFileName,
    });
  }

  const previewText = materialType === 'WORD'
    ? ['.docx'].includes(extension)
      ? await extractOfficePreviewText(filePath, ['word/document.xml', 'word/header', 'word/footer'])
      : await extractBinaryPreviewText(filePath)
    : materialType === 'POWERPOINT'
      ? ['.pptx'].includes(extension)
        ? await extractOfficePreviewText(filePath, ['ppt/slides/slide'])
        : await extractBinaryPreviewText(filePath)
      : '';

  if (materialType === 'POWERPOINT' && ['.pptx'].includes(extension)) {
    const slideBlocks = await extractOfficeTextBlocks(filePath, ['ppt/slides/slide']);
    const normalizedSlideBlocks = slideBlocks
      .map((entry) => cleanTextBlock(entry))
      .filter(Boolean);
    const slidePreviewText = cleanTextBlock(normalizedSlideBlocks.join('\n')).slice(0, 4000);
    const slideOutline = buildPowerPointOutlineFromSlides({
      title,
      subject,
      slides: normalizedSlideBlocks,
    });

    return {
      previewText: slidePreviewText || null,
      outlineJson: slideOutline.length > 0
        ? slideOutline
        : createFallbackOutline(
          {
            title,
            subject,
            description,
            materialType,
            originalFileName,
            previewText: slidePreviewText,
          },
          slidePreviewText
        ),
    };
  }

  const outlineJson = createFallbackOutline(
    {
      title,
      subject,
      description,
      materialType,
      originalFileName,
      previewText,
    },
    previewText
  );

  return {
    previewText: previewText || null,
    outlineJson,
  };
};

const hasPageIndexedOutline = (material) => {
  if (!['PDF', 'POWERPOINT'].includes(material?.materialType)) {
    return true;
  }

  if (!Array.isArray(material?.outlineJson) || material.outlineJson.length === 0) {
    return false;
  }

  return material.outlineJson.some((section) => (
    Array.isArray(section?.items)
      && section.items.some((item) => Number.isFinite(Number(item?.pageNumber)))
  ));
};

const buildUploadStatus = (material) => {
  const hasQuiz = Boolean(material.assessment);
  const moduleOnly = isModuleOnlyMaterial(material);
  return {
    state: moduleOnly ? 'MODULE_READY' : 'UPLOADED',
    label: moduleOnly ? (hasQuiz ? 'Module with quiz' : 'Module ready') : (hasQuiz ? 'Live with quiz' : 'Uploaded'),
    quizAttached: hasQuiz,
  };
};

const ensureMaterialArtifacts = async (material) => {
  if (!material?.id) {
    return material;
  }

  if (isModuleOnlyMaterial(material)) {
    return material;
  }

  const hasPreviewText = Boolean(String(material.previewText || '').trim());
  const hasOutline = Array.isArray(material.outlineJson) && material.outlineJson.length > 0;

  if (hasPreviewText && hasOutline && hasPageIndexedOutline(material)) {
    return material;
  }

  const artifacts = await buildLearningMaterialArtifacts({
    title: material.title,
    subject: material.subject,
    description: material.description,
    materialType: material.materialType,
    originalFileName: material.originalFileName,
    storedFileName: material.storedFileName,
  });

  return prisma.learningMaterial.update({
    where: { id: material.id },
    data: {
      previewText: artifacts.previewText,
      outlineJson: artifacts.outlineJson,
    },
    include: {
      assessment: {
        include: {
          questions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      teacher: {
        select: {
          id: true,
          courseCode: true,
          isArchived: true,
        },
      },
      progressRecords: true,
    },
  });
};

const serializeLearningMaterial = (material) => {
  const outline = normalizeOutline(material.outlineJson, material);
  const flatOutline = flattenOutline(outline, material);

  return {
    id: material.id,
    teacherId: material.teacherId,
    title: material.title,
    description: material.description || '',
    subject: material.subject || '',
    section: material.section,
    materialType: material.materialType,
    materialTypeLabel: isModuleOnlyMaterial(material)
      ? 'Module'
      : (MATERIAL_TYPE_LABELS[material.materialType] || material.materialType),
    mimeType: material.mimeType,
    originalFileName: material.originalFileName,
    fileSize: material.fileSize,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    fileEndpoint: `/api/users/learning-materials/${material.id}/file`,
    openWindowTtlMs: MATERIAL_INLINE_OPEN_MS,
    previewText: material.previewText || '',
    outline,
    outlineCount: flatOutline.length,
    hasSourceFile: !isModuleOnlyMaterial(material),
    uploadStatus: buildUploadStatus(material),
    assessment: serializeAssessmentSummary(material.assessment),
  };
};

const removeStoredLearningMaterialFile = async (storedFileName) => {
  const resolvedPath = path.resolve(LEARNING_MATERIALS_DIRECTORY, storedFileName);

  if (!resolvedPath.startsWith(LEARNING_MATERIALS_DIRECTORY)) {
    return;
  }

  try {
    await fs.unlink(resolvedPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const generateUniqueExamCode = async (tx) => {
  let examCode = null;

  while (!examCode) {
    const candidate = generateExamCode();
    const duplicate = await tx.exam.findUnique({
      where: { examCode: candidate },
      select: { id: true },
    });

    if (!duplicate) {
      examCode = candidate;
    }
  }

  return examCode;
};

const sendLearningMaterialFile = async (res, material) => {
  const filePath = path.resolve(LEARNING_MATERIALS_DIRECTORY, material.storedFileName);
  if (!filePath.startsWith(LEARNING_MATERIALS_DIRECTORY)) {
    const invalidPathError = new Error('Stored learning material path is invalid');
    invalidPathError.status = 500;
    throw invalidPathError;
  }

  try {
    await fs.access(filePath);
  } catch (error) {
    const missingFileError = new Error('Learning material file is missing from storage');
    missingFileError.status = 404;
    throw missingFileError;
  }

  const safeFileName = String(material.originalFileName || 'learning-material')
    .replace(/[\r\n"]/g, '_');
  const contentDispositionType = res.locals.learningMaterialDisposition === 'attachment' ? 'attachment' : 'inline';

  res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', String(material.fileSize || 0));
  res.setHeader('Content-Disposition', `${contentDispositionType}; filename="${safeFileName}"`);

  return res.sendFile(filePath);
};

const ensureTeacherOwnsStudent = async (teacherId, studentId) => {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      teacherId: true,
      section: true,
      firstName: true,
      lastName: true,
      username: true,
      isArchived: true
    }
  });

  if (!student || student.role !== 'STUDENT') {
    return { ok: false, status: 404, message: 'Student not found' };
  }

  if (student.isArchived) {
    return { ok: false, status: 400, message: 'Student account is archived' };
  }

  if (student.teacherId !== teacherId) {
    return { ok: false, status: 403, message: 'You can only access assigned students' };
  }

  return { ok: true, student };
};

const getStudentDisplayName = (student) => {
  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  return fullName || student?.username || 'Student';
};

const sanitizePerformanceInsight = (insight) => {
  if (!insight) {
    return null;
  }

  return {
    id: insight.id,
    strengths: Array.isArray(insight.strengths) ? insight.strengths : [],
    weaknesses: Array.isArray(insight.weaknesses) ? insight.weaknesses : [],
    recommendedAction: insight.recommendedAction || '',
    sourceSnapshot: insight.sourceSnapshot || null,
    model: insight.model || null,
    generatedAt: insight.generatedAt,
    updatedAt: insight.updatedAt,
  };
};

const normalizeStudentProgressRows = (levels = [], attempts = []) => {
  const orderedLevels = [...levels].sort((left, right) => {
    const leftGameIndex = GAME_ORDER_INDEX[left.level.gameType] ?? 999;
    const rightGameIndex = GAME_ORDER_INDEX[right.level.gameType] ?? 999;

    if (leftGameIndex !== rightGameIndex) {
      return leftGameIndex - rightGameIndex;
    }

    return left.level.gameLevelNumber - right.level.gameLevelNumber;
  });

  const levelProgress = orderedLevels.map((state) => ({
    legacyLevelNumber: state.level.levelNumber,
    levelNumber: state.level.gameLevelNumber,
    gameType: state.level.gameType,
    title: state.level.title,
    status: state.status,
    attemptsCount: state.attemptsCount,
    bestStars: state.bestStars,
    bestScore: state.bestScore,
    unlockedAt: state.unlockedAt,
    completedAt: state.completedAt
  }));

  const timeline = attempts.map((attempt) => ({
    id: attempt.id,
    legacyLevelNumber: attempt.level.levelNumber,
    levelNumber: attempt.level.gameLevelNumber,
    gameType: attempt.level.gameType,
    levelTitle: attempt.level.title,
    completed: attempt.completed,
    starsEarned: attempt.starsEarned,
    finalScore: attempt.finalScore,
    mistakes: attempt.mistakes,
    hintsUsed: attempt.hintsUsed,
    createdAt: attempt.createdAt,
    completedAt: attempt.completedAt
  }));

  const summary = {
    totalLevels: levelProgress.length,
    totalLevelsCompleted: levelProgress.filter((row) => row.status === 'COMPLETED').length,
    totalStars: levelProgress.reduce((sum, row) => sum + row.bestStars, 0),
    totalScore: levelProgress.reduce((sum, row) => sum + row.bestScore, 0),
    totalAttempts: timeline.length
  };

  return { levelProgress, timeline, summary };
};

const getStudentProgressBundle = async (teacherId, studentId) => {
  const [levels, attempts, policy, performanceInsight] = await Promise.all([
    prisma.studentLevelState.findMany({
      where: { studentId },
      include: {
        level: {
          select: {
            levelNumber: true,
            gameType: true,
            gameLevelNumber: true,
            title: true
          }
        }
      }
    }),
    prisma.levelAttempt.findMany({
      where: { studentId },
      include: {
        level: {
          select: {
            levelNumber: true,
            gameType: true,
            gameLevelNumber: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    prisma.teacherStudentPolicy.findUnique({
      where: {
        teacherId_studentId: {
          teacherId,
          studentId
        }
      }
    }),
    prisma.studentPerformanceInsight.findUnique({
      where: {
        teacherId_studentId: {
          teacherId,
          studentId
        }
      }
    })
  ]);

  const normalized = normalizeStudentProgressRows(levels, attempts);

  return {
    ...normalized,
    policy: policy || {
      difficultyPreset: 'STANDARD',
      freeMistakes: 3,
      hintStarCost: 1,
      notes: null
    },
    performanceInsight: sanitizePerformanceInsight(performanceInsight),
  };
};

const buildRosterLeaderboardRows = async (teacherId) => {
  const students = await prisma.user.findMany({
    where: {
      teacherId,
      role: 'STUDENT',
      isArchived: false
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      section: true,
      levelStates: {
        select: {
          status: true,
          bestStars: true,
          bestScore: true
        }
      },
      materialProgress: {
        select: {
          status: true,
          latestQuizScore: true,
          material: {
            select: {
              section: true,
              assessment: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      }
    }
  });

  const assessmentCountsBySection = new Map();
  const moduleCountsBySection = new Map();
  const studentSections = Array.from(
    new Set(
      students
        .map((student) => normalizeSectionKey(student.section))
        .filter(Boolean)
    )
  );

  if (studentSections.length > 0) {
    const assessmentCatalog = await prisma.learningMaterial.findMany({
      where: {
        teacherId,
        section: {
          in: studentSections
        },
        assessment: {
          isNot: null
        }
      },
      select: {
        section: true
      }
    });

    assessmentCatalog.forEach((material) => {
      const sectionKey = normalizeSectionKey(material.section);
      assessmentCountsBySection.set(sectionKey, (assessmentCountsBySection.get(sectionKey) || 0) + 1);
    });

    const moduleCatalog = await prisma.learningMaterial.findMany({
      where: {
        teacherId,
        section: {
          in: studentSections
        },
        assessment: {
          is: null
        }
      },
      select: {
        section: true
      }
    });

    moduleCatalog.forEach((material) => {
      const sectionKey = normalizeSectionKey(material.section);
      moduleCountsBySection.set(sectionKey, (moduleCountsBySection.get(sectionKey) || 0) + 1);
    });
  }

  return students
    .map((student) => {
      const completedLevels = student.levelStates.filter((item) => item.status === 'COMPLETED').length;
      const gameTotalStars = student.levelStates.reduce((sum, item) => sum + Number(item.bestStars || 0), 0);
      const totalScore = student.levelStates.reduce((sum, item) => sum + Number(item.bestScore || 0), 0);
      const totalLevels = student.levelStates.length;
      const studentSectionKey = normalizeSectionKey(student.section);
      const relevantModuleProgress = (student.materialProgress || []).filter((record) => (
        !record?.material?.assessment
        && normalizeSectionKey(record?.material?.section) === studentSectionKey
      ));
      const relevantAssessmentProgress = (student.materialProgress || []).filter((record) => (
        record?.material?.assessment
        && normalizeSectionKey(record.material.section) === studentSectionKey
      ));
      const totalModules = moduleCountsBySection.get(studentSectionKey) || 0;
      const completedModules = relevantModuleProgress.filter((record) => record.status === 'COMPLETED').length;
      const totalAssessments = assessmentCountsBySection.get(studentSectionKey) || 0;
      const completedAssessments = relevantAssessmentProgress.filter((record) => record.status === 'COMPLETED').length;
      const assessmentTotalStars = relevantAssessmentProgress.reduce((sum, record) => (
        sum + getAssessmentStarRating(record.latestQuizScore)
      ), 0);
      const completedActivities = completedLevels + completedModules + completedAssessments;
      const totalActivities = totalLevels + totalModules + totalAssessments;
      const totalStars = gameTotalStars + assessmentTotalStars;
      const safeTotalActivities = Math.max(totalActivities, 1);

      return {
        studentId: student.id,
        studentName: getStudentDisplayName(student),
        username: student.username,
        section: student.section || null,
        completedLevels,
        totalLevels: Math.max(totalLevels, 1),
        completedModules,
        totalModules,
        completedAssessments,
        totalAssessments,
        completedActivities,
        totalActivities: safeTotalActivities,
        totalStars,
        gameTotalStars,
        assessmentTotalStars,
        totalScore,
        progressPercent: Number(((completedActivities / safeTotalActivities) * 100).toFixed(2))
      };
    })
    .sort((a, b) => {
      if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
      if (b.completedActivities !== a.completedActivities) return b.completedActivities - a.completedActivities;
      return a.studentName.localeCompare(b.studentName);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

const buildUnassignedStudentLeaderboardRows = async (studentId) => {
  const student = await prisma.user.findUnique({
    where: {
      id: studentId
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      section: true,
      role: true,
      isArchived: true,
      levelStates: {
        select: {
          status: true,
          bestStars: true,
          bestScore: true
        }
      }
    }
  });

  if (!student || student.role !== 'STUDENT' || student.isArchived) {
    return [];
  }

  const completedLevels = student.levelStates.filter((item) => item.status === 'COMPLETED').length;
  const gameTotalStars = student.levelStates.reduce((sum, item) => sum + Number(item.bestStars || 0), 0);
  const totalScore = student.levelStates.reduce((sum, item) => sum + Number(item.bestScore || 0), 0);
  const totalLevels = Math.max(student.levelStates.length, 1);

  return [
    {
      studentId: student.id,
      studentName: getStudentDisplayName(student),
      username: student.username,
      section: student.section || null,
      completedLevels,
      totalLevels,
      completedModules: 0,
      totalModules: 0,
      completedAssessments: 0,
      totalAssessments: 0,
      completedActivities: completedLevels,
      totalActivities: totalLevels,
      totalStars: gameTotalStars,
      gameTotalStars,
      assessmentTotalStars: 0,
      totalScore,
      progressPercent: Number(((completedLevels / totalLevels) * 100).toFixed(2)),
      rank: 1
    }
  ];
};

const buildPerformanceInsightSnapshot = ({
  student,
  summary,
  levelProgress,
  timeline,
  policy,
  leaderboardEntry,
}) => ({
  student: {
    name: getStudentDisplayName(student),
    section: student?.section || '',
  },
  summary,
  policy: {
    difficultyPreset: policy?.difficultyPreset || 'STANDARD',
    freeMistakes: policy?.freeMistakes ?? 3,
    hintStarCost: policy?.hintStarCost ?? 1,
    notes: policy?.notes || null,
  },
  leaderboardEntry: leaderboardEntry || null,
  levelProgress: levelProgress.map((level) => ({
    gameType: level.gameType,
    levelNumber: level.levelNumber,
    title: level.title,
    status: level.status,
    attemptsCount: level.attemptsCount,
    bestStars: level.bestStars,
    bestScore: level.bestScore,
  })),
  recentAttempts: timeline.slice(0, 12).map((attempt) => ({
    gameType: attempt.gameType,
    levelNumber: attempt.levelNumber,
    completed: attempt.completed,
    starsEarned: attempt.starsEarned,
    finalScore: attempt.finalScore,
    mistakes: attempt.mistakes,
    hintsUsed: attempt.hintsUsed,
    createdAt: attempt.createdAt,
  })),
});

const getMyStudentsRoster = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view roster data'));
    }

    const { page = 1, limit = 10, search, isArchived } = req.query;

    const where = {
      teacherId: req.user.id,
      role: 'STUDENT',
      isArchived: isArchived === 'true'
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } }
      ];
    }

    const totalCount = await prisma.user.count({ where });
    const pagination = getPaginationData(page, limit, totalCount);

    const students = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            levelAttempts: true,
            materialQuizAttempts: true
          }
        },
        levelStates: {
          select: {
            status: true,
            bestStars: true,
            bestScore: true,
            completedAt: true
          }
        },
        levelAttempts: {
          select: {
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        materialProgress: {
          select: {
            status: true,
            progressPercent: true,
            startedAt: true,
            lastViewedAt: true,
            latestQuizScore: true,
            completedAt: true,
            updatedAt: true,
            material: {
              select: {
                section: true,
                assessment: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        materialQuizAttempts: {
          select: {
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.offset,
      take: pagination.limit
    });

    const assessmentCountsBySection = new Map();
    const moduleCountsBySection = new Map();
    const studentSections = Array.from(
      new Set(
        students
          .map((student) => normalizeSectionKey(student.section))
          .filter(Boolean)
      )
    );

    if (studentSections.length > 0) {
      const materialCatalog = await prisma.learningMaterial.findMany({
        where: {
          teacherId: req.user.id,
          section: {
            in: studentSections
          }
        },
        select: {
          section: true,
          assessment: {
            select: {
              id: true
            }
          }
        }
      });

      materialCatalog.forEach((material) => {
        const sectionKey = normalizeSectionKey(material.section);
        if (material.assessment) {
          assessmentCountsBySection.set(sectionKey, (assessmentCountsBySection.get(sectionKey) || 0) + 1);
        } else {
          moduleCountsBySection.set(sectionKey, (moduleCountsBySection.get(sectionKey) || 0) + 1);
        }
      });
    }

    const roster = students.map((student) => {
      const completedLevels = student.levelStates.filter((item) => item.status === 'COMPLETED').length;
      const gameTotalStars = student.levelStates.reduce((sum, item) => sum + Number(item.bestStars || 0), 0);
      const gameTotalScore = student.levelStates.reduce((sum, item) => sum + Number(item.bestScore || 0), 0);
      const totalLevels = student.levelStates.length;
      const gameProgressPercent = totalLevels > 0
        ? Number(((completedLevels / totalLevels) * 100).toFixed(2))
        : 0;
      const studentSectionKey = normalizeSectionKey(student.section);
      const relevantModuleProgress = (student.materialProgress || []).filter((record) => (
        !record?.material?.assessment
        && normalizeSectionKey(record?.material?.section) === studentSectionKey
      ));
      const relevantAssessmentProgress = (student.materialProgress || []).filter((record) => (
        record?.material?.assessment
        && normalizeSectionKey(record.material.section) === studentSectionKey
      ));
      const totalModules = moduleCountsBySection.get(studentSectionKey) || 0;
      const completedModules = relevantModuleProgress.filter((record) => record.status === 'COMPLETED').length;
      const startedModules = relevantModuleProgress.filter((record) => (
        record.status !== 'LOCKED'
        || Number(record.progressPercent || 0) > 0
        || Boolean(record.startedAt || record.lastViewedAt || record.completedAt)
      )).length;
      const totalAssessments = assessmentCountsBySection.get(studentSectionKey) || 0;
      const completedAssessments = relevantAssessmentProgress.filter((record) => record.status === 'COMPLETED').length;
      const attemptedAssessmentProgress = relevantAssessmentProgress.filter((record) => (
        (record.latestQuizScore !== null && record.latestQuizScore !== undefined)
        || record.status === 'IN_PROGRESS'
        || record.status === 'COMPLETED'
      ));
      const scoredAssessments = relevantAssessmentProgress
        .map((record) => Number(record.latestQuizScore))
        .filter((score) => Number.isFinite(score));
      const assessmentTotalStars = relevantAssessmentProgress.reduce((sum, record) => (
        sum + getAssessmentStarRating(record.latestQuizScore)
      ), 0);
      const assessmentTotalScore = scoredAssessments.reduce((sum, score) => sum + score, 0);
      const assessmentAverageScore = scoredAssessments.length > 0
        ? Number((assessmentTotalScore / scoredAssessments.length).toFixed(2))
        : 0;
      const moduleProgressPercent = totalModules > 0
        ? Number(((completedModules / totalModules) * 100).toFixed(2))
        : 0;
      const assessmentProgressPercent = totalAssessments > 0
        ? Number(((completedAssessments / totalAssessments) * 100).toFixed(2))
        : 0;
      const completedActivities = completedLevels + completedModules + completedAssessments;
      const totalActivities = totalLevels + totalModules + totalAssessments;
      const totalStars = gameTotalStars + assessmentTotalStars;
      const totalScore = gameTotalScore + assessmentTotalScore;
      const progressPercent = totalActivities > 0
        ? Number(((completedActivities / totalActivities) * 100).toFixed(2))
        : 0;
      const lastGameAttemptAt = student.levelAttempts[0]?.createdAt || null;
      const lastModuleActivityAt = getLatestTimestamp(
        relevantModuleProgress.map((record) => [
          record.startedAt,
          record.lastViewedAt,
          record.completedAt,
          record.updatedAt
        ])
      );
      const lastAssessmentAttemptAt = getLatestTimestamp(
        student.materialQuizAttempts[0]?.createdAt || null,
        relevantAssessmentProgress.map((record) => record.completedAt)
      );
      const lastAttemptAt = getLatestTimestamp(lastGameAttemptAt, lastModuleActivityAt, lastAssessmentAttemptAt);
      const gameAttemptsCount = Number(student?._count?.levelAttempts || 0);
      const assessmentAttemptsCount = Number(student?._count?.materialQuizAttempts || 0);
      const hasAnyActivity = Boolean(lastGameAttemptAt || lastModuleActivityAt || lastAssessmentAttemptAt);
      const activityRecordCount = [
        gameAttemptsCount > 0 ? 1 : 0,
        startedModules > 0 ? 1 : 0,
        assessmentAttemptsCount > 0 ? 1 : 0
      ].reduce((sum, count) => sum + count, 0);

      return {
        ...sanitizeUser(student),
        metrics: {
          completedLevels,
          totalLevels,
          completedModules,
          totalModules,
          startedModules,
          completedAssessments,
          totalAssessments,
          completedActivities,
          totalActivities,
          totalStars,
          gameTotalStars,
          assessmentTotalStars,
          totalScore,
          gameProgressPercent,
          moduleProgressPercent,
          assessmentProgressPercent,
          assessmentAverageScore,
          attemptedAssessments: attemptedAssessmentProgress.length,
          gameAttemptsCount,
          assessmentAttemptsCount,
          lastGameAttemptAt,
          lastModuleActivityAt,
          lastAssessmentAttemptAt,
          progressPercent,
          lastAttemptAt,
          hasAnyActivity,
          activityRecordCount
        }
      };
    });

    return res.status(200).json(successResponse({ students: roster, ...pagination.pagination }, 'Roster retrieved successfully'));
  } catch (error) {
    return next(error);
  }
};

const getStudentProgressDetail = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view student progression detail'));
    }

    const { studentId } = req.params;
    const ownership = await ensureTeacherOwnsStudent(req.user.id, studentId);

    if (!ownership.ok) {
      return res.status(ownership.status).json(errorResponse(ownership.message));
    }

    const {
      summary,
      levelProgress,
      timeline,
      policy,
      performanceInsight,
    } = await getStudentProgressBundle(req.user.id, studentId);

    return res.status(200).json(
      successResponse(
        {
          student: ownership.student,
          summary,
          levelProgress,
          timeline,
          policy,
          performanceInsight,
        },
        'Student progression detail retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getRosterLeaderboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view roster leaderboard'));
    }

    const leaderboard = await buildRosterLeaderboardRows(req.user.id);

    return res.status(200).json(successResponse({ leaderboard }, 'Roster leaderboard retrieved successfully'));
  } catch (error) {
    return next(error);
  }
};

const getStudentCourseLeaderboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view class leaderboard'));
    }

    const teacherId = typeof req.user.teacherId === 'string' ? req.user.teacherId.trim() : '';
    if (!teacherId) {
      const leaderboard = await buildUnassignedStudentLeaderboardRows(req.user.id);
      return res.status(200).json(successResponse({ leaderboard }, 'Class leaderboard retrieved successfully'));
    }

    const leaderboard = await buildRosterLeaderboardRows(teacherId);

    return res.status(200).json(successResponse({ leaderboard }, 'Class leaderboard retrieved successfully'));
  } catch (error) {
    return next(error);
  }
};

const upsertStudentPolicy = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can update student policies'));
    }

    const { studentId } = req.params;
    const ownership = await ensureTeacherOwnsStudent(req.user.id, studentId);

    if (!ownership.ok) {
      return res.status(ownership.status).json(errorResponse(ownership.message));
    }

    const {
      difficultyPreset = 'STANDARD',
      freeMistakes = 3,
      hintStarCost = 1,
      notes = null
    } = req.body;

    const policy = await prisma.teacherStudentPolicy.upsert({
      where: {
        teacherId_studentId: {
          teacherId: req.user.id,
          studentId
        }
      },
      create: {
        teacherId: req.user.id,
        studentId,
        difficultyPreset,
        freeMistakes,
        hintStarCost,
        notes
      },
      update: {
        difficultyPreset,
        freeMistakes,
        hintStarCost,
        notes
      }
    });

    return res.status(200).json(successResponse({ policy }, 'Student policy updated successfully'));
  } catch (error) {
    return next(error);
  }
};

const requestContentRegeneration = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can create content flags'));
    }

    const { studentId } = req.params;
    const { gameType, levelNumber, reason } = req.body;

    const ownership = await ensureTeacherOwnsStudent(req.user.id, studentId);
    if (!ownership.ok) {
      return res.status(ownership.status).json(errorResponse(ownership.message));
    }

    const level = await prisma.levelDefinition.findFirst({
      where: {
        gameType,
        gameLevelNumber: levelNumber,
        isActive: true
      },
      select: { id: true }
    });

    if (!level) {
      return res.status(404).json(errorResponse('Level not found for that game track'));
    }

    const flag = await prisma.contentFlag.create({
      data: {
        teacherId: req.user.id,
        studentId,
        levelId: level.id,
        gameType,
        reason,
        status: 'PENDING'
      }
    });

    return res.status(201).json(successResponse({ flag }, 'Content regeneration request submitted'));
  } catch (error) {
    return next(error);
  }
};

const getMyContentFlags = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view content flags'));
    }

    const { status } = req.query;

    const where = {
      teacherId: req.user.id,
      ...(status ? { status } : {})
    };

    const flags = await prisma.contentFlag.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        level: {
          select: {
            id: true,
            gameLevelNumber: true,
            title: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    const normalizedFlags = flags.map((flag) => ({
      ...flag,
      levelNumber: flag.level?.gameLevelNumber || null,
      levelTitle: flag.level?.title || null,
    }));

    return res.status(200).json(successResponse({ flags: normalizedFlags }, 'Content flags retrieved successfully'));
  } catch (error) {
    return next(error);
  }
};

const generateStudentPerformanceInsight = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can generate student performance insights'));
    }

    const { studentId } = req.params;
    const ownership = await ensureTeacherOwnsStudent(req.user.id, studentId);

    if (!ownership.ok) {
      return res.status(ownership.status).json(errorResponse(ownership.message));
    }

    const [
      progressBundle,
      leaderboard,
    ] = await Promise.all([
      getStudentProgressBundle(req.user.id, studentId),
      buildRosterLeaderboardRows(req.user.id),
    ]);

    const sourceSnapshot = buildPerformanceInsightSnapshot({
      student: ownership.student,
      summary: progressBundle.summary,
      levelProgress: progressBundle.levelProgress,
      timeline: progressBundle.timeline,
      policy: progressBundle.policy,
      leaderboardEntry: leaderboard.find((entry) => entry.studentId === studentId) || null,
    });

    const generatedInsight = await generatePerformanceInsightWithGemini({ sourceSnapshot });

    const savedInsight = await prisma.studentPerformanceInsight.upsert({
      where: {
        teacherId_studentId: {
          teacherId: req.user.id,
          studentId,
        },
      },
      create: {
        teacherId: req.user.id,
        studentId,
        strengths: generatedInsight.strengths,
        weaknesses: generatedInsight.weaknesses,
        recommendedAction: generatedInsight.recommendedAction,
        sourceSnapshot,
        model: generatedInsight.model || null,
        generatedAt: new Date(),
      },
      update: {
        strengths: generatedInsight.strengths,
        weaknesses: generatedInsight.weaknesses,
        recommendedAction: generatedInsight.recommendedAction,
        sourceSnapshot,
        model: generatedInsight.model || null,
        generatedAt: new Date(),
      },
    });

    return res.status(200).json(
      successResponse(
        { performanceInsight: sanitizePerformanceInsight(savedInsight) },
        'AI performance insight generated successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getTeacherLevelCanvas = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can access the level editor canvas'));
    }

    const { levelNumber } = req.params;
    const canvas = await getTeacherLevelCanvasData(req.user.id, levelNumber);

    return res.status(200).json(
      successResponse({ canvas }, 'Teacher level canvas retrieved successfully')
    );
  } catch (error) {
    return next(error);
  }
};

const saveTeacherLevelCanvas = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can save level editor canvas data'));
    }

    const { levelNumber } = req.params;
    const canvas = await saveTeacherLevelCanvasData(req.user.id, levelNumber, req.body || {});

    return res.status(200).json(
      successResponse({ canvas }, 'Teacher level canvas saved successfully')
    );
  } catch (error) {
    return next(error);
  }
};

const createLearningMaterial = async (req, res, next) => {
  let placeholderStoredFileName = '';
  let createdAssetFileNames = [];
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can upload learning materials'));
    }

    const file = req.file || null;
    const title = String(req.body?.title || '').trim();
    const section = normalizeSectionLabel(req.body?.section);
    const subject = normalizeOptionalText(req.body?.subject);
    const description = normalizeOptionalText(req.body?.description);
    const moduleStructure = parseModuleStructureJson(req.body?.moduleStructureJson);
    const hasModuleStructure = Array.isArray(moduleStructure) && moduleStructure.length > 0;

    if (!title) {
      if (file?.filename) {
        await removeStoredLearningMaterialFile(file.filename);
      }
      return res.status(400).json(errorResponse('Material title is required'));
    }

    if (!section) {
      if (file?.filename) {
        await removeStoredLearningMaterialFile(file.filename);
      }
      return res.status(400).json(errorResponse('Section is required'));
    }

    if (!file && !hasModuleStructure) {
      return res.status(400).json(errorResponse('Create at least one lesson item or upload a supporting file'));
    }

    const materialType = file ? detectLearningMaterialType(file) : 'WORD';
    if (file && !materialType) {
      await removeStoredLearningMaterialFile(file.filename);
      return res.status(400).json(errorResponse('Only PDF, video, Word, and PowerPoint files are supported'));
    }

    const persistedModuleStructure = hasModuleStructure
      ? await persistModuleStructureMediaAssets(moduleStructure)
      : null;
    createdAssetFileNames = persistedModuleStructure?.createdAssetFileNames || [];
    const materialOutline = persistedModuleStructure?.outlineJson || moduleStructure;

    const placeholderFile = !file
      ? await createModulePlaceholderFile(title, materialOutline)
      : null;
    placeholderStoredFileName = placeholderFile?.storedFileName || '';
    const originalFileName = placeholderFile?.originalFileName || String(file.originalname || file.filename || 'material');
    const storedFileName = placeholderFile?.storedFileName || file.filename;
    const nextMimeType = placeholderFile?.mimeType || file.mimetype || 'application/octet-stream';
    const nextFileSize = placeholderFile?.fileSize || Number(file?.size || 0);
    const artifacts = hasModuleStructure
      ? {
        outlineJson: materialOutline,
        previewText: buildStructuredOutlinePreviewText(materialOutline),
      }
      : await buildLearningMaterialArtifacts({
        title,
        subject,
        description,
        materialType,
        originalFileName,
        storedFileName,
      });

    const material = await prisma.$transaction(async (tx) => {
      const createdMaterial = await tx.learningMaterial.create({
        data: {
          teacherId: req.user.id,
          title,
          section,
          subject,
          description,
          materialType,
          mimeType: nextMimeType,
          originalFileName,
          storedFileName,
          fileSize: nextFileSize,
          outlineJson: artifacts.outlineJson,
          previewText: artifacts.previewText,
        },
      });

      const examCode = await generateUniqueExamCode(tx);

      const generatedQuestions = buildContentBasedQuizQuestions({
        title,
        subject,
        description,
        previewText: artifacts.previewText,
        outlineJson: artifacts.outlineJson,
      });

      await tx.exam.create({
        data: {
          title: `${title} Quiz`,
          description: description || `Quiz for ${title}`,
          examCode,
          timeLimit: 20,
          totalMarks: generatedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0),
          passingScore: 60,
          xpReward: DEFAULT_XP_REWARD,
          coinReward: DEFAULT_COIN_REWARD,
          shuffleQuestions: true,
          showResultsToStudents: true,
          isActive: true,
          teacherId: req.user.id,
          learningMaterialId: createdMaterial.id,
          questions: {
            create: generatedQuestions.map((question) => ({
              question: question.question,
              options: Array.isArray(question.options) ? question.options : [],
              correctAnswer: question.correctAnswer,
              type: question.type,
              marks: Number(question.marks || 10),
            })),
          },
        },
      });

      return tx.learningMaterial.findUnique({
        where: { id: createdMaterial.id },
        include: {
          assessment: {
            include: {
              questions: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });
    });

    return res.status(201).json(
      successResponse(
        { material: serializeLearningMaterial(material) },
        'Learning module created successfully'
      )
    );
  } catch (error) {
    if (req.file?.filename) {
      try {
        await removeStoredLearningMaterialFile(req.file.filename);
      } catch (cleanupError) {
        console.error('Learning material cleanup failed:', cleanupError.message);
      }
    }
    if (placeholderStoredFileName) {
      try {
        await removeStoredLearningMaterialFile(placeholderStoredFileName);
      } catch (cleanupError) {
        console.error('Module placeholder cleanup failed:', cleanupError.message);
      }
    }
    if (createdAssetFileNames.length > 0) {
      try {
        await Promise.all(createdAssetFileNames.map((fileName) => removeStoredLearningMaterialAssetFile(fileName)));
      } catch (cleanupError) {
        console.error('Learning material asset cleanup failed:', cleanupError.message);
      }
    }

    return next(error);
  }
};

const updateTeacherLearningMaterial = async (req, res, next) => {
  let createdAssetFileNames = [];
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can edit uploaded learning materials'));
    }

    const existingMaterial = await prisma.learningMaterial.findUnique({
      where: { id: req.params.materialId },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!existingMaterial || existingMaterial.teacherId !== req.user.id) {
      if (req.file?.filename) {
        await removeStoredLearningMaterialFile(req.file.filename);
      }

      return res.status(404).json(errorResponse('Learning material not found'));
    }

    const title = String(req.body?.title || existingMaterial.title).trim();
    const section = normalizeSectionLabel(req.body?.section ?? existingMaterial.section);
    const subject = normalizeOptionalText(req.body?.subject ?? existingMaterial.subject);
    const description = normalizeOptionalText(req.body?.description ?? existingMaterial.description);
    const file = req.file || null;
    const moduleStructure = parseModuleStructureJson(req.body?.moduleStructureJson);
    const hasModuleStructure = Array.isArray(moduleStructure) && moduleStructure.length > 0;
    const materialType = file ? detectLearningMaterialType(file) : existingMaterial.materialType;

    if (!title) {
      if (file?.filename) {
        await removeStoredLearningMaterialFile(file.filename);
      }

      return res.status(400).json(errorResponse('Material title is required'));
    }

    if (!section) {
      if (file?.filename) {
        await removeStoredLearningMaterialFile(file.filename);
      }

      return res.status(400).json(errorResponse('Section is required'));
    }

    if (file && !materialType) {
      await removeStoredLearningMaterialFile(file.filename);
      return res.status(400).json(errorResponse('Only PDF, video, Word, and PowerPoint files are supported'));
    }

    if (!file && !hasModuleStructure && isModuleOnlyMaterial(existingMaterial)) {
      return res.status(400).json(errorResponse('Module lessons cannot be empty'));
    }

    const nextOriginalFileName = file
      ? String(file.originalname || file.filename || existingMaterial.originalFileName)
      : existingMaterial.originalFileName;
    const nextStoredFileName = file?.filename || existingMaterial.storedFileName;
    const nextMimeType = file?.mimetype || existingMaterial.mimeType;
    const nextFileSize = file ? Number(file.size || 0) : existingMaterial.fileSize;
    const persistedModuleStructure = hasModuleStructure
      ? await persistModuleStructureMediaAssets(moduleStructure)
      : null;
    createdAssetFileNames = persistedModuleStructure?.createdAssetFileNames || [];
    const materialOutline = persistedModuleStructure?.outlineJson || moduleStructure;
    const retainedAssetFileNames = collectLearningMaterialAssetFileNames(materialOutline);
    const artifacts = hasModuleStructure
      ? {
        outlineJson: materialOutline,
        previewText: buildStructuredOutlinePreviewText(materialOutline),
      }
      : await buildLearningMaterialArtifacts({
        title,
        subject,
        description,
        materialType,
        originalFileName: nextOriginalFileName,
        storedFileName: nextStoredFileName,
      });

    const material = await prisma.$transaction(async (tx) => {
      const updatedMaterial = await tx.learningMaterial.update({
        where: { id: existingMaterial.id },
        data: {
          title,
          section,
          subject,
          description,
          materialType,
          mimeType: nextMimeType,
          originalFileName: nextOriginalFileName,
          storedFileName: nextStoredFileName,
          fileSize: nextFileSize,
          outlineJson: artifacts.outlineJson,
          previewText: artifacts.previewText,
        },
      });

      if (existingMaterial.assessment) {
        const shouldSeedQuestions = Array.isArray(existingMaterial.assessment.questions)
          && existingMaterial.assessment.questions.length === 0;
        const generatedQuestions = shouldSeedQuestions
          ? buildContentBasedQuizQuestions({
            title,
            subject,
            description,
            previewText: artifacts.previewText,
            outlineJson: artifacts.outlineJson,
          })
          : [];

        await tx.exam.update({
          where: { id: existingMaterial.assessment.id },
          data: {
            title: `${title} Quiz`,
            description: description || `Quiz for ${title}`,
            totalMarks: shouldSeedQuestions
              ? generatedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0)
              : existingMaterial.assessment.totalMarks,
            questions: shouldSeedQuestions
              ? {
                create: generatedQuestions.map((question) => ({
                  question: question.question,
                  options: Array.isArray(question.options) ? question.options : [],
                  correctAnswer: question.correctAnswer,
                  type: question.type,
                  marks: Number(question.marks || 10),
                })),
              }
              : undefined,
          },
        });
      }

      return tx.learningMaterial.findUnique({
        where: { id: updatedMaterial.id },
        include: {
          assessment: {
            include: {
              questions: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });
    });

    if (file?.filename && existingMaterial.storedFileName !== file.filename) {
      await removeStoredLearningMaterialFile(existingMaterial.storedFileName);
    }
    await cleanupLearningMaterialAssets(existingMaterial.outlineJson, retainedAssetFileNames);

    return res.status(200).json(
      successResponse(
        { material: serializeLearningMaterial(material) },
        'Learning module updated successfully'
      )
    );
  } catch (error) {
    if (req.file?.filename) {
      try {
        await removeStoredLearningMaterialFile(req.file.filename);
      } catch (cleanupError) {
        console.error('Learning material cleanup failed:', cleanupError.message);
      }
    }
    if (createdAssetFileNames.length > 0) {
      try {
        await Promise.all(createdAssetFileNames.map((fileName) => removeStoredLearningMaterialAssetFile(fileName)));
      } catch (cleanupError) {
        console.error('Learning material asset cleanup failed:', cleanupError.message);
      }
    }

    return next(error);
  }
};

const getTeacherLearningMaterials = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view uploaded learning materials'));
    }

    const materials = await prisma.learningMaterial.findMany({
      where: { teacherId: req.user.id },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return res.status(200).json(
      successResponse(
        {
          materials: materials.map(serializeLearningMaterial),
        },
        'Learning materials retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const deleteTeacherLearningMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can delete uploaded learning materials'));
    }

    const material = await prisma.learningMaterial.findUnique({
      where: { id: req.params.materialId },
    });

    if (!material || material.teacherId !== req.user.id) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    await prisma.$transaction(async (tx) => {
      const linkedExam = await tx.exam.findFirst({
        where: { learningMaterialId: material.id },
        select: { id: true },
      });

      if (linkedExam) {
        await tx.learningMaterialQuizAttempt.deleteMany({
          where: {
            materialId: material.id,
          },
        });

        await tx.score.deleteMany({
          where: { examId: linkedExam.id },
        });

        await tx.question.deleteMany({
          where: { examId: linkedExam.id },
        });

        await tx.exam.delete({
          where: { id: linkedExam.id },
        });
      }

      await tx.learningMaterialProgress.deleteMany({
        where: { materialId: material.id },
      });

      await tx.learningMaterial.delete({
        where: { id: material.id },
      });
    });

    await removeStoredLearningMaterialFile(material.storedFileName);
    await cleanupLearningMaterialAssets(material.outlineJson);

    return res.status(200).json(
      successResponse(null, 'Learning material deleted successfully')
    );
  } catch (error) {
    return next(error);
  }
};

const getAssignedLearningMaterials = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view assigned learning materials'));
    }

    const catalog = await buildStudentMaterialCatalog(req.user.id);
    if (!catalog.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    if (!catalog.student.teacherId || !catalog.teacher) {
      return res.status(200).json(
        successResponse(
          {
            materials: [],
            teacher: null,
          },
          'Learning materials retrieved successfully'
        )
      );
    }

    return res.status(200).json(
      successResponse(
        {
          materials: catalog.materials,
          teacher: catalog.teacher,
        },
        'Learning materials retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getAssignedLearningMaterialDetail = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view module details'));
    }

    let detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
    if (!detail.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    if (!detail.material) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (
      detail.material.materialType === 'PDF'
      || detail.material.materialType === 'POWERPOINT'
      || !String(detail.material.previewText || '').trim()
      || !hasPageIndexedOutline(detail.material)
    ) {
      const sourceMaterial = await prisma.learningMaterial.findUnique({
        where: { id: req.params.materialId },
        include: {
          assessment: {
            include: {
              questions: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              courseCode: true,
              isArchived: true,
            },
          },
          progressRecords: true,
        },
      });

      if (sourceMaterial) {
        await ensureMaterialArtifacts(sourceMaterial);
        detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
      }
    }

    return res.status(200).json(
      successResponse(
        {
          material: detail.material,
          teacher: detail.teacher,
        },
        'Learning material detail retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const startAssignedLearningMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can start modules'));
    }

    const detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
    if (!detail.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    if (!detail.material) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (detail.material.isLocked) {
      return res.status(403).json(errorResponse('Complete the previous module first to unlock this lesson'));
    }

    const outlineCount = Number(detail.material.outlineCount || detail.material.outlineItems?.length || 0);
    const progressRecord = await prisma.learningMaterialProgress.upsert({
      where: {
        studentId_materialId: {
          studentId: req.user.id,
          materialId: detail.material.id,
        },
      },
      create: {
        studentId: req.user.id,
        materialId: detail.material.id,
        status: 'IN_PROGRESS',
        progressPercent: 0,
        currentOutlineIndex: 0,
        outlineCount,
        startedAt: new Date(),
        lastViewedAt: new Date(),
      },
      update: {
        status: detail.material.progress.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        outlineCount,
        startedAt: detail.material.progress.startedAt || new Date(),
        lastViewedAt: new Date(),
      },
    });

    return res.status(200).json(
      successResponse(
        {
          progress: {
            ...detail.material.progress,
            status: progressRecord.status,
            statusLabel: progressRecord.status === 'COMPLETED' ? 'Completed' : 'In Progress',
            startedAt: progressRecord.startedAt,
            lastViewedAt: progressRecord.lastViewedAt,
          },
        },
        'Module started successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const saveAssignedLearningMaterialProgress = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can save module progress'));
    }

    const detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
    if (!detail.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    if (!detail.material) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (detail.material.isLocked) {
      return res.status(403).json(errorResponse('This module is still locked'));
    }

    const outlineCount = Number(detail.material.outlineCount || detail.material.outlineItems?.length || 0);
    const currentOutlineIndex = Math.max(0, Math.min(outlineCount > 0 ? outlineCount - 1 : 0, Number.parseInt(req.body?.currentOutlineIndex, 10) || 0));
    const viewedItems = Math.max(0, Number.parseInt(req.body?.viewedItems, 10) || currentOutlineIndex + 1);
    const progressPercent = outlineCount > 0
      ? Math.max(0, Math.min(100, Math.round((Math.min(viewedItems, outlineCount) / outlineCount) * 100)))
      : Math.max(0, Math.min(100, Number.parseInt(req.body?.progressPercent, 10) || 0));
    const timeSpentIncrement = Math.max(0, Math.min(3600, Number.parseInt(req.body?.timeSpentSeconds, 10) || 0));

    const updatedProgress = await prisma.learningMaterialProgress.upsert({
      where: {
        studentId_materialId: {
          studentId: req.user.id,
          materialId: detail.material.id,
        },
      },
      create: {
        studentId: req.user.id,
        materialId: detail.material.id,
        status: progressPercent >= 100 ? 'IN_PROGRESS' : 'IN_PROGRESS',
        progressPercent,
        currentOutlineIndex,
        outlineCount,
        timeSpentSeconds: timeSpentIncrement,
        startedAt: new Date(),
        lastViewedAt: new Date(),
      },
      update: {
        status: detail.material.progress.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        progressPercent: detail.material.progress.status === 'COMPLETED'
          ? 100
          : Math.max(progressPercent, Number(detail.material.progress.percent || 0)),
        currentOutlineIndex: detail.material.progress.status === 'COMPLETED'
          ? Math.max(currentOutlineIndex, Number(detail.material.progress.currentOutlineIndex || 0))
          : currentOutlineIndex,
        outlineCount,
        timeSpentSeconds: {
          increment: timeSpentIncrement,
        },
        startedAt: detail.material.progress.startedAt || new Date(),
        lastViewedAt: new Date(),
      },
    });

    return res.status(200).json(
      successResponse(
        {
          progress: {
            status: updatedProgress.status,
            statusLabel: updatedProgress.status === 'COMPLETED' ? 'Completed' : 'In Progress',
            percent: updatedProgress.progressPercent,
            currentOutlineIndex: updatedProgress.currentOutlineIndex,
            outlineCount: updatedProgress.outlineCount,
            timeSpentSeconds: updatedProgress.timeSpentSeconds,
            startedAt: updatedProgress.startedAt,
            lastViewedAt: updatedProgress.lastViewedAt,
            completedAt: updatedProgress.completedAt,
            latestQuizScore: updatedProgress.latestQuizScore,
            xpEarned: updatedProgress.xpEarned,
            coinsEarned: updatedProgress.coinsEarned,
          },
        },
        'Module progress saved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getStudentMaterialsProgressSummary = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view module progress'));
    }

    const catalog = await buildStudentMaterialCatalog(req.user.id);
    if (!catalog.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    const materials = catalog.materials;
    const totals = materials.reduce((accumulator, material) => {
      const status = material.progress.status;
      accumulator.total += 1;
      accumulator.totalProgress += Number(material.progress.percent || 0);
      accumulator.totalTimeSpentSeconds += Number(material.progress.timeSpentSeconds || 0);
      accumulator.totalXp += Number(material.progress.xpEarned || 0);
      accumulator.totalCoins += Number(material.progress.coinsEarned || 0);

      if (status === 'COMPLETED') {
        accumulator.completed += 1;
      } else if (status === 'IN_PROGRESS') {
        accumulator.inProgress += 1;
      } else if (status === 'LOCKED') {
        accumulator.locked += 1;
      } else {
        accumulator.notStarted += 1;
      }

      if (material.progress.latestQuizScore !== null && material.progress.latestQuizScore !== undefined) {
        accumulator.quizScores.push(Number(material.progress.latestQuizScore));
      }

      return accumulator;
    }, {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      locked: 0,
      totalProgress: 0,
      totalTimeSpentSeconds: 0,
      totalXp: 0,
      totalCoins: 0,
      quizScores: [],
    });

    const averageQuizScore = totals.quizScores.length > 0
      ? Math.round(totals.quizScores.reduce((sum, score) => sum + score, 0) / totals.quizScores.length)
      : 0;

    return res.status(200).json(
      successResponse(
        {
          summary: {
            overallProgressPercent: totals.total > 0 ? Math.round(totals.totalProgress / totals.total) : 0,
            completedModules: totals.completed,
            inProgressModules: totals.inProgress,
            notStartedModules: totals.notStarted,
            lockedModules: totals.locked,
            averageQuizScore,
            totalTimeSpentSeconds: totals.totalTimeSpentSeconds,
            totalXp: totals.totalXp,
            totalCoins: totals.totalCoins,
          },
          materials,
        },
        'Learning progress retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const downloadLearningMaterialFile = async (req, res, next) => {
  try {
    res.locals.learningMaterialDisposition = req.query?.download === '1' ? 'attachment' : 'inline';
    const material = await prisma.learningMaterial.findUnique({
      where: { id: req.params.materialId },
      include: {
        teacher: {
          select: {
            id: true,
            courseCode: true,
            isArchived: true,
          },
        },
      },
    });

    if (!material || !material.teacher || material.teacher.isArchived) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (isModuleOnlyMaterial(material)) {
      return res.status(404).json(errorResponse('This lesson is edited directly in the module builder and has no downloadable source file'));
    }

    if (req.user.role === 'TEACHER') {
      if (material.teacherId !== req.user.id) {
        return res.status(403).json(errorResponse('You can only access your own uploaded learning materials'));
      }

      return await sendLearningMaterialFile(res, material);
    }

    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only teachers and students can access learning materials'));
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        teacherId: true,
        section: true,
        isArchived: true,
      },
    });

    if (!student || student.role !== 'STUDENT' || student.isArchived) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    const allowedSections = buildStudentMaterialAudienceSections(
      student.section,
      material.teacher.courseCode
    );

    if (student.teacherId !== material.teacherId || !allowedSections.includes(material.section)) {
      return res.status(403).json(errorResponse('This learning material is not assigned to your section'));
    }

    return await sendLearningMaterialFile(res, material);
  } catch (error) {
    return next(error);
  }
};

const uploadLearningMaterialAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('Please choose a video file'));
    }

    return res.status(201).json(successResponse({
      src: `${LEARNING_MATERIAL_ASSET_ROUTE}/${req.file.filename}`,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    }, 'Lesson video uploaded successfully'));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyStudentsRoster,
  getStudentProgressDetail,
  getRosterLeaderboard,
  getStudentCourseLeaderboard,
  upsertStudentPolicy,
  requestContentRegeneration,
  getMyContentFlags,
  generateStudentPerformanceInsight,
  getTeacherLevelCanvas,
  saveTeacherLevelCanvas,
  createLearningMaterial,
  updateTeacherLearningMaterial,
  getTeacherLearningMaterials,
  deleteTeacherLearningMaterial,
  getAssignedLearningMaterials,
  getAssignedLearningMaterialDetail,
  startAssignedLearningMaterial,
  saveAssignedLearningMaterialProgress,
  getStudentMaterialsProgressSummary,
  downloadLearningMaterialFile,
  uploadLearningMaterialAsset,
};
