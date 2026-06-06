export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  currentGroupId?: string | null;
  joinedGroupIds?: string[];
}

export interface WorshipTarget {
  id: string; // unique target setting id, e.g., "target-1234"
  userId: string;
  name: string; // e.g. "Shalat 5 Waktu", "Tilawah Al-Quran"
  metric: string; // e.g. "kali", "halaman", "rupiah", "rakaat"
  targetValue: number; // e.g. 5, 10, 50000, 12
  frequency: "daily" | "weekly";
  createdAt: string;
}

export interface ActivityLog {
  id: string; // unique log id e.g. "log-targetId-YYYYMMDD"
  userId: string;
  targetId: string;
  targetName: string;
  date: string; // YYYY-MM-DD
  value: number; // actual recorded value
  targetValue: number; // historical target setting
  metric: string;
  completed: boolean;
  updatedAt: string;
}

export interface IbadahGroup {
  id: string;
  name: string;
  code: string; // unique invite code e.g. "123456"
  description: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
}

export interface IbadahGroupMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface WorshipNudge {
  id: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  targetName: string;
  timestamp: string;
  isRead: boolean;
}
