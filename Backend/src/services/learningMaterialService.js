const prisma = require('../lib/prisma');

const MATERIAL_INLINE_OPEN_MS = 60000;
const MODULE_ONLY_MIME_TYPE = 'application/vnd.itechs.module+json';
const MATERIAL_TYPE_LABELS = {
  PDF: 'PDF',
  VIDEO: 'Video',
  WORD: 'Word',
  POWERPOINT: 'PowerPoint',
};

const DEFAULT_XP_REWARD = 50;
const DEFAULT_COIN_REWARD = 10;

const normalizeSectionLabel = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '';
};

const normalizeCourseCodeLabel = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const buildStudentMaterialAudienceSections = (studentSection, teacherCourseCode) => {
  const normalizedStudentSection = normalizeSectionLabel(studentSection);
  const normalizedTeacherCourseCode = normalizeCourseCodeLabel(teacherCourseCode);

  return [...new Set([normalizedStudentSection, normalizedTeacherCourseCode].filter(Boolean))];
};

const cleanTextBlock = (value) => (
  String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
);

const isModuleOnlyMaterial = (material = {}) => (
  String(material?.mimeType || '').trim().toLowerCase() === MODULE_ONLY_MIME_TYPE
);

const toSlug = (value, fallback) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const splitPreviewChunks = (text) => {
  const normalized = cleanTextBlock(text);
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12);

  const sentenceSource = lines.length > 0 ? lines.join('. ') : normalized;
  return sentenceSource
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12)
    .slice(0, 12);
};

const buildStructuredOutlinePreviewText = (outlineJson = []) => {
  if (!Array.isArray(outlineJson) || outlineJson.length === 0) {
    return '';
  }

  const text = outlineJson
    .flatMap((section) => {
      const sectionTitle = cleanTextBlock(section?.title || '');
      const items = Array.isArray(section?.items) ? section.items : [];
      const sectionParts = [sectionTitle];

      items.forEach((item) => {
        if (typeof item === 'string') {
          sectionParts.push(cleanTextBlock(item));
          return;
        }

        sectionParts.push(cleanTextBlock(item?.title || item?.label || ''));
        sectionParts.push(cleanTextBlock(item?.content || item?.body || item?.description || ''));
        if (Array.isArray(item?.subtopics)) {
          item.subtopics.forEach((subtopic) => {
            sectionParts.push(cleanTextBlock(subtopic?.title || subtopic?.label || ''));
            sectionParts.push(cleanTextBlock(subtopic?.content || subtopic?.body || subtopic?.description || ''));
          });
        }
      });

      return sectionParts.filter(Boolean);
    })
    .filter(Boolean)
    .join('\n');

  return cleanTextBlock(text).slice(0, 4000);
};

const buildUniqueOptionList = (correctAnswer, candidateOptions = [], count = 4) => {
  const normalizedCorrect = String(correctAnswer || '').trim();
  const normalizedPool = candidateOptions
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, collection) => collection.indexOf(value) === index)
    .filter((value) => value !== normalizedCorrect);

  return [normalizedCorrect, ...normalizedPool].slice(0, count);
};

const splitAssessmentStatements = (text = '') => (
  cleanTextBlock(text)
    .split(/(?<=[.!?])\s+/)
    .map((entry) => cleanTextBlock(entry))
    .filter((entry) => entry.length >= 24)
    .map((entry) => entry.slice(0, 220))
);

const collectMaterialAssessmentFacts = (material = {}) => {
  const outline = normalizeOutline(material.outlineJson || material.outline, material);
  const facts = [];
  const imageFacts = [];

  splitPreviewChunks(`${material.previewText || ''}\n${material.description || ''}`).forEach((entry) => {
    facts.push(entry);
  });

  outline.forEach((section) => {
    (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
      splitAssessmentStatements(item?.content || item?.body || item?.description || '').forEach((entry) => {
        facts.push(entry);
      });

      const itemImageParts = [
        cleanTextBlock(item?.media?.caption || ''),
        cleanTextBlock(item?.media?.alt || ''),
        cleanTextBlock(item?.media?.name || ''),
      ].filter(Boolean);
      if (itemImageParts.length > 0) {
        imageFacts.push(itemImageParts.join(' - ').slice(0, 220));
      }

      (Array.isArray(item?.subtopics) ? item.subtopics : []).forEach((subtopic) => {
        splitAssessmentStatements(subtopic?.content || subtopic?.body || subtopic?.description || '').forEach((entry) => {
          facts.push(entry);
        });

        const subtopicImageParts = [
          cleanTextBlock(subtopic?.media?.caption || ''),
          cleanTextBlock(subtopic?.media?.alt || ''),
          cleanTextBlock(subtopic?.media?.name || ''),
        ].filter(Boolean);
        if (subtopicImageParts.length > 0) {
          imageFacts.push(subtopicImageParts.join(' - ').slice(0, 220));
        }
      });
    });
  });

  const uniqueFacts = [...facts, ...imageFacts]
    .map((entry) => cleanTextBlock(entry))
    .filter((entry) => entry.length >= 18)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) === index);

  return {
    facts: uniqueFacts.slice(0, 16),
    imageFacts: imageFacts
      .map((entry) => cleanTextBlock(entry))
      .filter(Boolean)
      .filter((entry, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) === index)
      .slice(0, 8),
  };
};

const createFallbackOutline = (material = {}, previewText = '') => {
  const title = String(material.title || 'Learning Module').trim() || 'Learning Module';
  const subject = String(material.subject || '').trim();
  const description = cleanTextBlock(material.description || '');
  const chunks = splitPreviewChunks(`${previewText}\n${description}`);
  const topicLabel = subject || title;
  const introItems = chunks.slice(0, 3);
  const detailItems = chunks.slice(3, 6);
  const reviewItems = chunks.slice(6, 9);

  const sections = [
    {
      id: `${toSlug(title, 'module')}-overview`,
      title: `Introduction to ${topicLabel}`,
      items: introItems.length > 0
        ? introItems
        : [
          `Overview of ${topicLabel}`,
          `Main ideas from ${title}`,
          `Learning goals and context`,
        ],
    },
    {
      id: `${toSlug(title, 'module')}-content`,
      title: 'Key Concepts',
      items: detailItems.length > 0
        ? detailItems
        : [
          `Core lesson points from ${title}`,
          `Important examples or demonstrations`,
          `How this lesson connects to class activities`,
        ],
    },
    {
      id: `${toSlug(title, 'module')}-review`,
      title: 'Review and Practice',
      items: reviewItems.length > 0
        ? reviewItems
        : [
          'Summary of important takeaways',
          'Practice and reflection prompts',
          'Prepare for the connected quiz',
        ],
    },
  ];

  return sections.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    items: section.items.map((item, itemIndex) => ({
      id: `${section.id}-${itemIndex + 1}`,
      title: item,
      order: itemIndex,
      pageLabel: `${sectionIndex + 1}.${itemIndex + 1}`,
    })),
  }));
};

const buildContentBasedQuizQuestions = (material = {}) => {
  const moduleTitle = String(material.title || 'this module').trim() || 'this module';
  const { facts, imageFacts } = collectMaterialAssessmentFacts(material);
  const questions = [];

  facts.slice(0, 3).forEach((fact, index) => {
    const statementOptions = buildUniqueOptionList(fact, facts.filter((entry) => entry !== fact), 4);
    if (statementOptions.length >= 2) {
      questions.push({
        question: `Which statement is supported by the lesson in ${moduleTitle}?`,
        options: statementOptions,
        correctAnswer: fact,
        type: 'multiple_choice',
        marks: 10,
      });
    }

    if (index === 0) {
      questions.push({
        question: `This lesson teaches the following idea from ${moduleTitle}: "${fact}"`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        type: 'true_false',
        marks: 10,
      });
    }
  });

  if (imageFacts.length > 0) {
    const imageFact = imageFacts[0];
    const imageOptions = buildUniqueOptionList(imageFact, facts.filter((entry) => entry !== imageFact), 4);
    if (imageOptions.length >= 2) {
      questions.push({
        question: `Which statement best matches the lesson image information in ${moduleTitle}?`,
        options: imageOptions,
        correctAnswer: imageFact,
        type: 'multiple_choice',
        marks: 10,
      });
    }
  }

  if (questions.length === 0) {
    const fallbackTopic = facts[0] || `one important lesson from ${moduleTitle}`;
    questions.push({
      question: `Which statement best describes a key idea from ${moduleTitle}?`,
      options: buildUniqueOptionList(
        fallbackTopic,
        ['An unrelated lesson detail', 'A statement not found in the module', 'A random off-topic idea'],
        4
      ),
      correctAnswer: fallbackTopic,
      type: 'multiple_choice',
      marks: 10,
    });
  }

  return questions
    .filter((question, index, collection) => (
      collection.findIndex((entry) => entry.question === question.question) === index
    ))
    .slice(0, 5);
};

const normalizeOutline = (outlineJson, material = {}) => {
  if (!Array.isArray(outlineJson) || outlineJson.length === 0) {
    return createFallbackOutline(material, material.previewText || '');
  }

  const normalizedSections = outlineJson
    .map((section, sectionIndex) => {
      const title = String(section?.title || `Section ${sectionIndex + 1}`).trim();
      const sectionId = String(section?.id || `${toSlug(title, `section-${sectionIndex + 1}`)}`);
      const items = Array.isArray(section?.items) ? section.items : [];
      const normalizedItems = items
        .map((item, itemIndex) => {
          if (typeof item === 'string') {
            const itemTitle = item.trim();
            if (!itemTitle) {
              return null;
            }

            return {
              id: `${sectionId}-${itemIndex + 1}`,
              title: itemTitle,
              order: itemIndex,
              pageLabel: `${sectionIndex + 1}.${itemIndex + 1}`,
              pageNumber: null,
            };
          }

          const itemTitle = String(item?.title || item?.label || '').trim();
          if (!itemTitle) {
            return null;
          }

          return {
            id: String(item.id || `${sectionId}-${itemIndex + 1}`),
            title: itemTitle,
            order: Number(item.order ?? itemIndex),
            pageLabel: String(item.pageLabel || `${sectionIndex + 1}.${itemIndex + 1}`),
            pageNumber: Number.isFinite(Number(item.pageNumber)) ? Number(item.pageNumber) : null,
            content: cleanTextBlock(item?.content || item?.body || item?.description || ''),
            contentType: cleanTextBlock(item?.contentType || item?.kind || 'lesson') || 'lesson',
            subtopics: (Array.isArray(item?.subtopics) ? item.subtopics : [])
              .map((subtopic, subtopicIndex) => {
                const subtopicTitle = cleanTextBlock(subtopic?.title || subtopic?.label || `Subtopic ${subtopicIndex + 1}`);
                const subtopicContent = cleanTextBlock(subtopic?.content || subtopic?.body || subtopic?.description || '');
                if (!subtopicTitle && !subtopicContent) {
                  return null;
                }

                return {
                  id: String(subtopic?.id || `${sectionId}-${itemIndex + 1}-subtopic-${subtopicIndex + 1}`),
                  title: subtopicTitle || `Subtopic ${subtopicIndex + 1}`,
                  content: subtopicContent,
                  media: subtopic?.media && typeof subtopic.media === 'object' && cleanTextBlock(subtopic.media.src || subtopic.media.url || '')
                    ? {
                      src: cleanTextBlock(subtopic.media.src || subtopic.media.url || ''),
                      alt: cleanTextBlock(subtopic.media.alt || ''),
                      caption: cleanTextBlock(subtopic.media.caption || ''),
                      name: cleanTextBlock(subtopic.media.name || ''),
                      placement: cleanTextBlock(subtopic.media.placement || 'right') || 'right',
                      width: Math.max(18, Math.min(70, Number(subtopic.media.width || 34))),
                      position: {
                        x: Math.max(0, Math.min(82, Number(subtopic.media?.position?.x ?? subtopic.media?.x ?? 8))),
                        y: Math.max(0, Math.min(82, Number(subtopic.media?.position?.y ?? subtopic.media?.y ?? 8))),
                      },
                    }
                    : null,
                };
              })
              .filter(Boolean),
            media: item?.media && typeof item.media === 'object' && cleanTextBlock(item.media.src || item.media.url || '')
              ? {
                src: cleanTextBlock(item.media.src || item.media.url || ''),
                alt: cleanTextBlock(item.media.alt || ''),
                caption: cleanTextBlock(item.media.caption || ''),
                name: cleanTextBlock(item.media.name || ''),
                placement: cleanTextBlock(item.media.placement || 'right') || 'right',
                width: Math.max(18, Math.min(70, Number(item.media.width || 34))),
                position: {
                  x: Math.max(0, Math.min(82, Number(item.media?.position?.x ?? item.media?.x ?? 8))),
                  y: Math.max(0, Math.min(82, Number(item.media?.position?.y ?? item.media?.y ?? 8))),
                },
              }
              : null,
            video: item?.video && typeof item.video === 'object' && cleanTextBlock(item.video.src || item.video.url || '')
              ? {
                src: cleanTextBlock(item.video.src || item.video.url || ''),
                name: cleanTextBlock(item.video.name || ''),
                caption: cleanTextBlock(item.video.caption || ''),
                mimeType: cleanTextBlock(item.video.mimeType || 'video/mp4') || 'video/mp4',
              }
              : null,
          };
        })
        .filter(Boolean);

      if (!title || normalizedItems.length === 0) {
        return null;
      }

      return {
        id: sectionId,
        title,
        items: normalizedItems,
      };
    })
    .filter(Boolean);

  return normalizedSections.length > 0
    ? normalizedSections
    : createFallbackOutline(material, material.previewText || '');
};

const flattenOutline = (outlineJson, material = {}) => {
  const outline = normalizeOutline(outlineJson, material);

  return outline.flatMap((section, sectionIndex) => (
    section.items.map((item, itemIndex) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
      absoluteIndex: outline
        .slice(0, sectionIndex)
        .reduce((sum, currentSection) => sum + currentSection.items.length, 0) + itemIndex,
    }))
  ));
};

const buildMaterialQuestionGenerationSource = (material = {}) => {
  const normalizedOutline = normalizeOutline(material.outlineJson || material.outline, material);
  const previewSentences = splitPreviewChunks(`${material.previewText || ''}\n${material.description || ''}`).slice(0, 10);
  const coverageTargets = [];
  const imageReferences = [];

  normalizedOutline.forEach((section) => {
    const sectionTitle = String(section?.title || '').trim();
    if (sectionTitle) {
      coverageTargets.push(sectionTitle);
    }

    (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
      const itemTitle = cleanTextBlock(item?.title || '');
      if (itemTitle) {
        coverageTargets.push(itemTitle);
      }

      if (item?.media) {
        imageReferences.push({
          sectionTitle,
          itemTitle,
          subtopicTitle: '',
          alt: cleanTextBlock(item.media.alt || '').slice(0, 220),
          caption: cleanTextBlock(item.media.caption || '').slice(0, 260),
          name: cleanTextBlock(item.media.name || '').slice(0, 160),
        });
      }

      (Array.isArray(item?.subtopics) ? item.subtopics : []).forEach((subtopic) => {
        const subtopicTitle = cleanTextBlock(subtopic?.title || '');
        if (subtopicTitle) {
          coverageTargets.push(subtopicTitle);
        }

        if (subtopic?.media) {
          imageReferences.push({
            sectionTitle,
            itemTitle,
            subtopicTitle,
            alt: cleanTextBlock(subtopic.media.alt || '').slice(0, 220),
            caption: cleanTextBlock(subtopic.media.caption || '').slice(0, 260),
            name: cleanTextBlock(subtopic.media.name || '').slice(0, 160),
          });
        }
      });
    });
  });

  const uniqueCoverageTargets = coverageTargets
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) === index)
    .slice(0, 16);

  return {
    moduleTitle: String(material.title || 'Learning Module').trim() || 'Learning Module',
    subject: String(material.subject || '').trim(),
    section: String(material.section || '').trim(),
    description: cleanTextBlock(material.description || '').slice(0, 1200),
    previewText: cleanTextBlock(material.previewText || '').slice(0, 2500),
    previewSentences,
    coverageTargets: uniqueCoverageTargets,
    imageReferences: imageReferences
      .filter((entry) => entry.alt || entry.caption || entry.name)
      .slice(0, 12),
    sections: normalizedOutline.map((section, sectionIndex) => ({
      title: String(section?.title || `Section ${sectionIndex + 1}`).trim(),
      items: (Array.isArray(section?.items) ? section.items : []).map((item, itemIndex) => ({
        pageLabel: String(item?.pageLabel || `${sectionIndex + 1}.${itemIndex + 1}`).trim(),
        title: cleanTextBlock(item?.title || '').slice(0, 180),
        content: cleanTextBlock(item?.content || item?.body || item?.description || '').slice(0, 1200),
        contentType: cleanTextBlock(item?.contentType || item?.kind || 'lesson').slice(0, 60),
        image: item?.media
          ? {
            alt: cleanTextBlock(item.media.alt || '').slice(0, 220),
            caption: cleanTextBlock(item.media.caption || '').slice(0, 260),
            name: cleanTextBlock(item.media.name || '').slice(0, 160),
          }
          : null,
        subtopics: (Array.isArray(item?.subtopics) ? item.subtopics : []).map((subtopic, subtopicIndex) => ({
          title: cleanTextBlock(subtopic?.title || `Subtopic ${subtopicIndex + 1}`).slice(0, 180),
          content: cleanTextBlock(subtopic?.content || subtopic?.body || subtopic?.description || '').slice(0, 1000),
          image: subtopic?.media
            ? {
              alt: cleanTextBlock(subtopic.media.alt || '').slice(0, 220),
              caption: cleanTextBlock(subtopic.media.caption || '').slice(0, 260),
              name: cleanTextBlock(subtopic.media.name || '').slice(0, 160),
            }
            : null,
        })),
      })),
    })),
  };
};

const compareMaterialsForSequence = (left, right) => {
  const leftSubject = String(left.subject || '').trim().toLowerCase();
  const rightSubject = String(right.subject || '').trim().toLowerCase();
  if (leftSubject !== rightSubject) {
    return leftSubject.localeCompare(rightSubject);
  }

  const leftCreatedAt = new Date(left.createdAt).getTime();
  const rightCreatedAt = new Date(right.createdAt).getTime();
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return String(left.title || '').localeCompare(String(right.title || ''), undefined, { sensitivity: 'base' });
};

const serializeAssessmentSummary = (assessment) => {
  if (!assessment) {
    return null;
  }

  const questionCount = Array.isArray(assessment.questions) ? assessment.questions.length : 0;

  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description || '',
    status: assessment.isActive === false ? 'DRAFT' : 'PUBLISHED',
    totalQuestions: questionCount,
    timeLimit: Number(assessment.timeLimit || 30),
    totalMarks: questionCount * 10,
    passingScore: Math.max(90, Math.min(100, Number(assessment.passingScore || 90))),
    xpReward: Number(assessment.xpReward || DEFAULT_XP_REWARD),
    coinReward: Number(assessment.coinReward || DEFAULT_COIN_REWARD),
    shuffleQuestions: assessment.shuffleQuestions !== false,
    showResultsToStudents: assessment.showResultsToStudents !== false,
  };
};

const getProgressStatusLabel = (status) => {
  if (status === 'COMPLETED') {
    return 'Completed';
  }

  if (status === 'IN_PROGRESS') {
    return 'In Progress';
  }

  if (status === 'LOCKED') {
    return 'Locked';
  }

  return 'Not Started';
};

const serializeStudentMaterial = ({
  material,
  progress,
  outline,
  flatOutline,
  nextMaterialId,
  previousMaterialId,
  isLocked = false,
}) => {
  const assessment = serializeAssessmentSummary(material.assessment);
  const storedStatus = progress?.status || 'NOT_STARTED';
  const currentStatus = isLocked
    ? 'LOCKED'
    : storedStatus === 'LOCKED'
      ? 'NOT_STARTED'
      : storedStatus;
  const progressPercent = Math.max(0, Math.min(100, Number(progress?.progressPercent || 0)));
  const latestQuizScore = progress?.latestQuizScore ?? null;

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
    outline,
    outlineItems: flatOutline,
    outlineCount: flatOutline.length,
    hasSourceFile: !isModuleOnlyMaterial(material),
    progress: {
      status: currentStatus,
      statusLabel: getProgressStatusLabel(currentStatus),
      percent: progressPercent,
      currentOutlineIndex: Math.max(0, Number(progress?.currentOutlineIndex || 0)),
      outlineCount: flatOutline.length,
      timeSpentSeconds: Number(progress?.timeSpentSeconds || 0),
      startedAt: progress?.startedAt || null,
      lastViewedAt: progress?.lastViewedAt || null,
      completedAt: progress?.completedAt || null,
      latestQuizScore,
      xpEarned: Number(progress?.xpEarned || 0),
      coinsEarned: Number(progress?.coinsEarned || 0),
    },
    isLocked,
    previewText: material.previewText || '',
    assessment,
    nextMaterialId: nextMaterialId || null,
    previousMaterialId: previousMaterialId || null,
  };
};

const getStudentWithTeacher = async (studentId) => (
  prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      teacherId: true,
      section: true,
      isArchived: true,
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          courseCode: true,
          isArchived: true,
        },
      },
    },
  })
);

const getOrderedStudentMaterials = async (student) => {
  if (!student?.teacherId || !student?.teacher || student.teacher.isArchived) {
    return [];
  }

  const audienceSections = buildStudentMaterialAudienceSections(student.section, student.teacher.courseCode);
  const materials = await prisma.learningMaterial.findMany({
    where: {
      teacherId: student.teacherId,
      section: {
        in: audienceSections,
      },
    },
    include: {
      assessment: {
        include: {
          questions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      progressRecords: {
        where: { studentId: student.id },
      },
    },
  });

  return [...materials].sort(compareMaterialsForSequence);
};

const buildStudentMaterialCatalog = async (studentId) => {
  const student = await getStudentWithTeacher(studentId);
  if (!student || student.role !== 'STUDENT' || student.isArchived) {
    return {
      student: null,
      teacher: null,
      materials: [],
    };
  }

  const materials = await getOrderedStudentMaterials(student);
  const serializedMaterials = materials.map((material, index, collection) => {
    const progress = Array.isArray(material.progressRecords) ? material.progressRecords[0] || null : null;
    const outline = normalizeOutline(material.outlineJson, material);
    const flatOutline = flattenOutline(outline, material);
    const previousMaterial = collection[index - 1] || null;
    const previousProgress = Array.isArray(previousMaterial?.progressRecords)
      ? previousMaterial.progressRecords[0] || null
      : null;
    const currentStatus = String(progress?.status || 'NOT_STARTED').trim().toUpperCase();
    const previousStatus = String(previousProgress?.status || 'NOT_STARTED').trim().toUpperCase();
    const hasCurrentAccess = currentStatus === 'IN_PROGRESS' || currentStatus === 'COMPLETED';
    const isLocked = index > 0 && previousStatus !== 'COMPLETED' && !hasCurrentAccess;

    return serializeStudentMaterial({
      material,
      progress,
      outline,
      flatOutline,
      isLocked,
      nextMaterialId: materials[index + 1]?.id || null,
      previousMaterialId: materials[index - 1]?.id || null,
    });
  });

  return {
    student,
    teacher: student.teacher
      ? {
        id: student.teacher.id,
        displayName: `${student.teacher.firstName || ''} ${student.teacher.lastName || ''}`.trim() || student.teacher.username || 'Teacher',
      }
      : null,
    materials: serializedMaterials,
    hasUnlockedMaterial: serializedMaterials.length > 0,
  };
};

const getStudentMaterialDetail = async (studentId, materialId) => {
  const catalog = await buildStudentMaterialCatalog(studentId);
  const material = catalog.materials.find((entry) => entry.id === materialId) || null;

  return {
    ...catalog,
    material,
  };
};

module.exports = {
  DEFAULT_XP_REWARD,
  DEFAULT_COIN_REWARD,
  MATERIAL_TYPE_LABELS,
  MATERIAL_INLINE_OPEN_MS,
  MODULE_ONLY_MIME_TYPE,
  normalizeSectionLabel,
  normalizeCourseCodeLabel,
  buildStudentMaterialAudienceSections,
  cleanTextBlock,
  isModuleOnlyMaterial,
  buildStructuredOutlinePreviewText,
  createFallbackOutline,
  buildContentBasedQuizQuestions,
  buildMaterialQuestionGenerationSource,
  normalizeOutline,
  flattenOutline,
  serializeAssessmentSummary,
  buildStudentMaterialCatalog,
  getStudentMaterialDetail,
  getStudentWithTeacher,
};
