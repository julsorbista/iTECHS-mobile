import girlAvatar1 from './girl-avatar-1.png';
import girlAvatar2 from './girl-avatar-2.png';
import girlAvatar3 from './girl-avatar-3.png';
import girlAvatar4 from './girl-avatar-4.png';
import boyAvatar1 from './boy-avatar-1.png';
import boyAvatar2 from './boy-avatar-2.png';
import boyAvatar3 from './boy-avatar-3.png';
import boyAvatar4 from './boy-avatar-4.png';

export const STUDENT_AVATAR_OPTIONS = Object.freeze([
  { id: 'girl-avatar-1', label: 'Girl Avatar 1', category: 'girl', image: girlAvatar1 },
  { id: 'girl-avatar-2', label: 'Girl Avatar 2', category: 'girl', image: girlAvatar2 },
  { id: 'girl-avatar-3', label: 'Girl Avatar 3', category: 'girl', image: girlAvatar3 },
  { id: 'girl-avatar-4', label: 'Girl Avatar 4', category: 'girl', image: girlAvatar4 },
  { id: 'boy-avatar-1', label: 'Boy Avatar 1', category: 'boy', image: boyAvatar1 },
  { id: 'boy-avatar-2', label: 'Boy Avatar 2', category: 'boy', image: boyAvatar2 },
  { id: 'boy-avatar-3', label: 'Boy Avatar 3', category: 'boy', image: boyAvatar3 },
  { id: 'boy-avatar-4', label: 'Boy Avatar 4', category: 'boy', image: boyAvatar4 },
]);

export const DEFAULT_STUDENT_AVATAR_KEY = STUDENT_AVATAR_OPTIONS[0].id;

export const STUDENT_AVATAR_GROUPS = Object.freeze({
  girl: STUDENT_AVATAR_OPTIONS.filter((avatar) => avatar.category === 'girl'),
  boy: STUDENT_AVATAR_OPTIONS.filter((avatar) => avatar.category === 'boy'),
});

export const getStudentAvatarByKey = (avatarKey) => (
  STUDENT_AVATAR_OPTIONS.find((avatar) => avatar.id === avatarKey) || null
);

export const getStudentAvatarCategory = (avatarKey) => (
  getStudentAvatarByKey(avatarKey)?.category || 'girl'
);
