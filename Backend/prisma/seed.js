const bcrypt = require('bcrypt');
const {
  ensureLevelCatalog,
  getLevelDefinitionByGame,
} = require('../src/services/levelCatalogService');

const prisma = require('../src/lib/prisma');

const initializeStudentProgression = async (studentId) => {
  await ensureLevelCatalog();

  const levelDefinitions = await prisma.levelDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ gameType: 'asc' }, { gameLevelNumber: 'asc' }],
  });

  await prisma.studentLevelState.createMany({
    data: levelDefinitions.map((level) => ({
      studentId,
      levelId: level.id,
      status: level.gameLevelNumber === 1 ? 'UNLOCKED' : 'LOCKED',
      unlockedAt: level.gameLevelNumber === 1 ? new Date() : null,
    })),
    skipDuplicates: true,
  });
};

const SAMPLE_STUDENT_SEEDS = Object.freeze([
  {
    email: 'admin@student.com',
    username: 'admin@student.com',
    firstName: 'Game',
    lastName: 'Student',
    section: 'A1',
    progress: [
      { gameType: 'GAME_ONE', levelNumber: 1, status: 'COMPLETED', attemptsCount: 2, bestStars: 3, bestScore: 100, attempts: 2 },
      { gameType: 'GAME_TWO', levelNumber: 1, status: 'COMPLETED', attemptsCount: 2, bestStars: 3, bestScore: 92, attempts: 2 },
      { gameType: 'GAME_TWO', levelNumber: 2, status: 'UNLOCKED', attemptsCount: 1, bestStars: 1, bestScore: 36, attempts: 1 },
      { gameType: 'GAME_THREE', levelNumber: 1, status: 'UNLOCKED', attemptsCount: 0, bestStars: 0, bestScore: 0, attempts: 0 },
    ],
  },
  {
    email: 'maya@student.com',
    username: 'maya@student.com',
    firstName: 'Maya',
    lastName: 'Torres',
    section: 'A1',
    progress: [
      { gameType: 'GAME_ONE', levelNumber: 1, status: 'COMPLETED', attemptsCount: 1, bestStars: 3, bestScore: 97, attempts: 1 },
      { gameType: 'GAME_TWO', levelNumber: 1, status: 'COMPLETED', attemptsCount: 2, bestStars: 3, bestScore: 88, attempts: 2 },
      { gameType: 'GAME_TWO', levelNumber: 2, status: 'COMPLETED', attemptsCount: 2, bestStars: 2, bestScore: 74, attempts: 2 },
      { gameType: 'GAME_TWO', levelNumber: 3, status: 'UNLOCKED', attemptsCount: 1, bestStars: 1, bestScore: 40, attempts: 1 },
    ],
  },
  {
    email: 'noah@student.com',
    username: 'noah@student.com',
    firstName: 'Noah',
    lastName: 'Kim',
    section: 'B2',
    progress: [
      { gameType: 'GAME_ONE', levelNumber: 1, status: 'UNLOCKED', attemptsCount: 1, bestStars: 0, bestScore: 32, attempts: 1 },
      { gameType: 'GAME_TWO', levelNumber: 1, status: 'UNLOCKED', attemptsCount: 0, bestStars: 0, bestScore: 0, attempts: 0 },
      { gameType: 'GAME_THREE', levelNumber: 1, status: 'UNLOCKED', attemptsCount: 0, bestStars: 0, bestScore: 0, attempts: 0 },
    ],
  },
  {
    email: 'amalia@student.com',
    username: 'amalia@student.com',
    firstName: 'Amalia',
    lastName: 'Reed',
    section: 'B2',
    progress: [
      { gameType: 'GAME_ONE', levelNumber: 1, status: 'COMPLETED', attemptsCount: 2, bestStars: 3, bestScore: 95, attempts: 2 },
      { gameType: 'GAME_TWO', levelNumber: 1, status: 'COMPLETED', attemptsCount: 1, bestStars: 3, bestScore: 90, attempts: 1 },
      { gameType: 'GAME_TWO', levelNumber: 2, status: 'COMPLETED', attemptsCount: 1, bestStars: 3, bestScore: 84, attempts: 1 },
      { gameType: 'GAME_THREE', levelNumber: 1, status: 'UNLOCKED', attemptsCount: 1, bestStars: 1, bestScore: 28, attempts: 1 },
    ],
  },
]);

const seedLevelProgressForStudent = async (studentId, levelMap, progressEntries = []) => {
  for (const entry of progressEntries) {
    const level = levelMap.get(`${entry.gameType}:${Number(entry.levelNumber)}`);
    if (!level) {
      continue;
    }

    const status = entry.status || 'LOCKED';
    const completedAt = status === 'COMPLETED' ? new Date() : null;
    const unlockedAt = status === 'LOCKED' ? null : new Date();

    await prisma.studentLevelState.upsert({
      where: {
        studentId_levelId: {
          studentId,
          levelId: level.id,
        },
      },
      update: {
        status,
        attemptsCount: Number(entry.attemptsCount || 0),
        bestStars: Number(entry.bestStars || 0),
        bestScore: Number(entry.bestScore || 0),
        unlockedAt,
        completedAt,
      },
      create: {
        studentId,
        levelId: level.id,
        status,
        attemptsCount: Number(entry.attemptsCount || 0),
        bestStars: Number(entry.bestStars || 0),
        bestScore: Number(entry.bestScore || 0),
        unlockedAt,
        completedAt,
      },
    });

    const attemptCount = Number(entry.attempts || 0);
    for (let attemptIndex = 1; attemptIndex <= attemptCount; attemptIndex += 1) {
      const attemptNumber = attemptIndex;
      const existingAttempt = await prisma.levelAttempt.findFirst({
        where: {
          studentId,
          levelId: level.id,
          attemptNumber,
        },
      });

      const attemptPayload = {
        studentId,
        levelId: level.id,
        sessionId: null,
        attemptNumber,
        gameType: entry.gameType,
        mistakes: attemptIndex === attemptCount && status === 'COMPLETED' ? 0 : 1,
        hintsUsed: attemptIndex === 1 ? 1 : 0,
        starsEarned: Number(entry.bestStars || 0),
        baseScore: Number(entry.bestScore || 0),
        finalScore: Number(entry.bestScore || 0),
        retryMultiplier: 1,
        completed: status === 'COMPLETED',
        completedAt: status === 'COMPLETED' ? new Date() : null,
      };

      if (existingAttempt) {
        await prisma.levelAttempt.update({
          where: { id: existingAttempt.id },
          data: attemptPayload,
        });
      } else {
        await prisma.levelAttempt.create({
          data: attemptPayload,
        });
      }
    }
  }
};

const ensureTeacherStudentPolicy = async (teacherId, studentId) => {
  await prisma.teacherStudentPolicy.upsert({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId,
      },
    },
    update: {
      teacherId,
      difficultyPreset: 'STANDARD',
      freeMistakes: 3,
      hintStarCost: 1,
      notes: 'Default policy applied by seed data.',
    },
    create: {
      teacherId,
      studentId,
      difficultyPreset: 'STANDARD',
      freeMistakes: 3,
      hintStarCost: 1,
      notes: 'Default policy applied by seed data.',
    },
  });
};

const ensureContentFlag = async ({ teacherId, studentId, resolverUserId }) => {
  await ensureLevelCatalog();

  const level = await getLevelDefinitionByGame('GAME_ONE', 1);
  if (!level) {
    return;
  }

  const existingFlag = await prisma.contentFlag.findFirst({
    where: {
      teacherId,
      studentId,
      levelId: level.id,
      gameType: 'GAME_ONE',
      reason: 'Sample review request seeded for moderation workflow.',
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });

  if (existingFlag) {
    await prisma.contentFlag.update({
      where: { id: existingFlag.id },
      data: {
        status: 'IN_REVIEW',
        resolverUserId,
        resolutionNote: null,
        resolvedAt: null,
      },
    });
    return;
  }

  await prisma.contentFlag.create({
    data: {
      teacherId,
      studentId,
      levelId: level.id,
      gameType: 'GAME_ONE',
      reason: 'Sample review request seeded for moderation workflow.',
      status: 'IN_REVIEW',
      resolverUserId,
    },
  });
};

const ensureAuthTrail = async ({ studentId, actorUserId }) => {
  const existingAttempt = await prisma.loginAttempt.findFirst({
    where: {
      userId: studentId,
      usernameRaw: 'admin@student.com',
      success: true,
    },
  });

  if (!existingAttempt) {
    await prisma.loginAttempt.create({
      data: {
        userId: studentId,
        usernameRaw: 'admin@student.com',
        ipAddress: '127.0.0.1',
        success: true,
      },
    });
  }

  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      actorUserId,
      action: 'SEED_DATA_REFRESH',
      entityType: 'seed',
      entityId: 'bootstrap',
    },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'SEED_DATA_REFRESH',
        entityType: 'seed',
        entityId: 'bootstrap',
        metadata: {
          seededBy: 'prisma/seed.js',
          sampleUsers: ['admin@gmail.com', 'admin@teacher.com', ...SAMPLE_STUDENT_SEEDS.map((studentSeed) => studentSeed.email)],
        },
        ipAddress: '127.0.0.1',
      },
    });
  }
};

async function main() {
  console.log('Start seeding ...');
  const defaultPassword = '123456';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const accounts = {
    superAdmin: 'admin@gmail.com',
    teacher: 'admin@teacher.com',
    student: 'admin@student.com',
  };

  const superAdmin = await prisma.user.upsert({
    where: { email: accounts.superAdmin },
    update: {
      username: accounts.superAdmin,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isArchived: false,
      isVerified: true,
      otpVerified: true,
      otpCode: null,
      otpExpiry: null,
    },
    create: {
      email: accounts.superAdmin,
      username: accounts.superAdmin,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isArchived: false,
      isVerified: true,
      otpVerified: true,
    },
  });

  console.log('\nCreated Super Admin:');
  console.log('   Email:', superAdmin.email);
  console.log('   Username:', superAdmin.username);
  console.log('   Password:', defaultPassword);

  const teacher = await prisma.user.upsert({
    where: { email: accounts.teacher },
    update: {
      username: accounts.teacher,
      password: hashedPassword,
      firstName: 'Class',
      lastName: 'Teacher',
      role: 'TEACHER',
      courseCode: 'TEACH001',
      isArchived: false,
      isVerified: true,
      otpVerified: true,
      otpCode: null,
      otpExpiry: null,
    },
    create: {
      email: accounts.teacher,
      username: accounts.teacher,
      password: hashedPassword,
      firstName: 'Class',
      lastName: 'Teacher',
      role: 'TEACHER',
      courseCode: 'TEACH001',
      isArchived: false,
      isVerified: true,
      otpVerified: true,
    },
  });

  console.log('\nCreated Teacher:');
  console.log('   Email:', teacher.email);
  console.log('   Username:', teacher.username);
  console.log('   Password:', defaultPassword);

  await ensureLevelCatalog();
  const levelDefinitions = await prisma.levelDefinition.findMany({
    where: { isActive: true },
    select: {
      id: true,
      gameType: true,
      gameLevelNumber: true,
    },
  });

  const levelMap = new Map(levelDefinitions.map((level) => [`${level.gameType}:${level.gameLevelNumber}`, level]));
  const seededStudents = [];

  for (const studentSeed of SAMPLE_STUDENT_SEEDS) {
    const seededStudent = await prisma.user.upsert({
      where: { email: studentSeed.email },
      update: {
        username: studentSeed.username,
        password: hashedPassword,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        role: 'STUDENT',
        section: studentSeed.section,
        isArchived: false,
        isVerified: true,
        otpVerified: true,
        otpCode: null,
        otpExpiry: null,
        teacherId: teacher.id,
      },
      create: {
        email: studentSeed.email,
        username: studentSeed.username,
        password: hashedPassword,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        role: 'STUDENT',
        section: studentSeed.section,
        isArchived: false,
        isVerified: true,
        otpVerified: true,
        teacherId: teacher.id,
      },
    });

    await initializeStudentProgression(seededStudent.id);
    await seedLevelProgressForStudent(seededStudent.id, levelMap, studentSeed.progress);
    await ensureTeacherStudentPolicy(teacher.id, seededStudent.id);

    seededStudents.push(seededStudent);

    console.log('\nCreated Student:');
    console.log('   Email:', seededStudent.email);
    console.log('   Username:', seededStudent.username);
    console.log('   Password:', defaultPassword);
  }

  const exam = await prisma.exam.upsert({
    where: { examCode: 'EXAM101' },
    update: {
      teacherId: teacher.id,
      isActive: true,
    },
    create: {
      title: 'Introduction to Computer Science',
      description: 'Basic concepts of computing',
      examCode: 'EXAM101',
      isActive: true,
      timeLimit: 60,
      totalMarks: 100,
      teacherId: teacher.id,
      questions: {
        create: [
          {
            question: 'What is the binary representation of 5?',
            options: ['101', '110', '111', '100'],
            correctAnswer: '101',
            marks: 10,
            type: 'multiple_choice',
          },
          {
            question: 'What does CPU stand for?',
            options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Processor Unit'],
            correctAnswer: 'Central Processing Unit',
            marks: 10,
            type: 'multiple_choice',
          },
        ],
      },
    },
  });

  await ensureContentFlag({
    teacherId: teacher.id,
    studentId: seededStudents[0].id,
    resolverUserId: superAdmin.id,
  });
  await ensureAuthTrail({
    studentId: seededStudents[0].id,
    actorUserId: superAdmin.id,
  });

  console.log('\nCreated Exam:', exam.title);
  console.log('\n========================================');
  console.log('Seeding finished successfully!');
  console.log('========================================');
  console.log('\nDefault Credentials:');
  console.log('   Password for all accounts: 123456');
  console.log(`\n   Super Admin: ${accounts.superAdmin}`);
  console.log(`   Teacher: ${accounts.teacher}`);
  console.log(`   Student: ${accounts.student}`);
  console.log(`   Sample Students: ${SAMPLE_STUDENT_SEEDS.map((studentSeed) => studentSeed.email).join(', ')}`);
  console.log('   OTP bypass is active for these sample emails only.');
  console.log('========================================\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
