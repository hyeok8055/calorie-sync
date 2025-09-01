/**
 * 그룹 설정 데이터 스키마 정의
 * Firebase Firestore: groups/{groupId}, groupMembers/{groupId}, groupSettings/{groupId}
 * 
 * 칼로리 그룹 관리 및 그룹별 편차 설정을 관리
 */

// 그룹 기본 정보 스키마
export const GroupSchema = {
  // 그룹 ID
  groupId: {
    type: 'string',
    required: true,
    description: '그룹 고유 식별자'
  },
  
  // 그룹 이름
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50,
    description: '그룹 이름'
  },
  
  // 그룹 설명
  description: {
    type: 'string',
    nullable: true,
    maxLength: 500,
    description: '그룹 설명'
  },
  
  // 그룹 색상
  color: {
    type: 'string',
    pattern: '^#[0-9A-Fa-f]{6}$',
    default: '#3B82F6',
    description: '그룹 대표 색상 (HEX 코드)'
  },
  
  // 기본 편차값
  defaultDeviation: {
    type: 'number',
    minimum: -1000,
    maximum: 1000,
    default: 0,
    description: '그룹 기본 칼로리 편차값 (kcal)'
  },
  
  // 편차 배수
  deviationMultiplier: {
    type: 'number',
    minimum: 0.1,
    maximum: 5.0,
    default: 1.0,
    description: '편차 적용 배수'
  },
  
  // 그룹 타입
  groupType: {
    type: 'string',
    enum: ['research', 'community', 'family', 'friends', 'workplace', 'other'],
    default: 'community',
    description: '그룹 유형 (research: 연구, community: 커뮤니티, family: 가족, friends: 친구, workplace: 직장, other: 기타)'
  },
  
  // 그룹 상태
  status: {
    type: 'string',
    enum: ['active', 'inactive', 'archived', 'suspended'],
    default: 'active',
    description: '그룹 상태 (active: 활성, inactive: 비활성, archived: 보관, suspended: 정지)'
  },
  
  // 공개 여부
  isPublic: {
    type: 'boolean',
    default: false,
    description: '그룹 공개 여부'
  },
  
  // 가입 승인 필요 여부
  requiresApproval: {
    type: 'boolean',
    default: true,
    description: '가입 시 승인 필요 여부'
  },
  
  // 최대 멤버 수
  maxMembers: {
    type: 'number',
    minimum: 1,
    maximum: 1000,
    default: 50,
    description: '최대 멤버 수'
  },
  
  // 현재 멤버 수
  currentMemberCount: {
    type: 'number',
    minimum: 0,
    default: 0,
    description: '현재 멤버 수'
  },
  
  // 그룹 생성자
  createdBy: {
    type: 'string',
    required: true,
    description: '그룹 생성자 사용자 ID'
  },
  
  // 그룹 관리자 목록
  admins: {
    type: 'array',
    items: {
      type: 'string'
    },
    default: [],
    description: '그룹 관리자 사용자 ID 목록'
  },
  
  // 그룹 태그
  tags: {
    type: 'array',
    items: {
      type: 'string',
      maxLength: 20
    },
    maxItems: 10,
    default: [],
    description: '그룹 태그 목록'
  },
  
  // 그룹 설정
  settings: {
    type: 'object',
    properties: {
      // 편차 설정 자동 적용 여부
      autoApplyDeviation: {
        type: 'boolean',
        default: true,
        description: '편차 설정 자동 적용 여부'
      },
      
      // 멤버 간 데이터 공유 허용
      allowDataSharing: {
        type: 'boolean',
        default: false,
        description: '멤버 간 칼로리 데이터 공유 허용'
      },
      
      // 그룹 통계 공개
      showGroupStats: {
        type: 'boolean',
        default: true,
        description: '그룹 통계 정보 공개'
      },
      
      // 알림 설정
      notifications: {
        type: 'object',
        properties: {
          newMember: {
            type: 'boolean',
            default: true,
            description: '새 멤버 가입 알림'
          },
          deviationUpdate: {
            type: 'boolean',
            default: true,
            description: '편차 설정 업데이트 알림'
          },
          weeklyReport: {
            type: 'boolean',
            default: false,
            description: '주간 리포트 알림'
          }
        }
      }
    }
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '그룹 생성 시간'
  },
  
  // 마지막 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '그룹 마지막 업데이트 시간'
  },
  
  // 마지막 활동 시간
  lastActivityAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '그룹 마지막 활동 시간'
  }
};

// 그룹 멤버 스키마
export const GroupMemberSchema = {
  // 멤버 ID
  memberId: {
    type: 'string',
    required: true,
    description: '멤버 고유 식별자 (groupId_uid)'
  },
  
  // 그룹 ID
  groupId: {
    type: 'string',
    required: true,
    description: '그룹 ID'
  },
  
  // 사용자 ID
  uid: {
    type: 'string',
    required: true,
    description: '사용자 ID'
  },
  
  // 멤버 역할
  role: {
    type: 'string',
    enum: ['owner', 'admin', 'moderator', 'member'],
    default: 'member',
    description: '멤버 역할 (owner: 소유자, admin: 관리자, moderator: 중재자, member: 일반 멤버)'
  },
  
  // 멤버 상태
  status: {
    type: 'string',
    enum: ['active', 'pending', 'suspended', 'left'],
    default: 'pending',
    description: '멤버 상태 (active: 활성, pending: 승인 대기, suspended: 정지, left: 탈퇴)'
  },
  
  // 닉네임 (그룹 내)
  nickname: {
    type: 'string',
    nullable: true,
    maxLength: 30,
    description: '그룹 내 닉네임'
  },
  
  // 가입 신청 메시지
  joinMessage: {
    type: 'string',
    nullable: true,
    maxLength: 200,
    description: '가입 신청 시 메시지'
  },
  
  // 개인 편차 설정 (그룹 내)
  personalSettings: {
    type: 'object',
    properties: {
      // 그룹 편차 적용 여부
      applyGroupDeviation: {
        type: 'boolean',
        default: true,
        description: '그룹 편차 설정 적용 여부'
      },
      
      // 개인 편차 배수
      personalMultiplier: {
        type: 'number',
        minimum: 0.1,
        maximum: 5.0,
        default: 1.0,
        description: '개인별 편차 배수'
      },
      
      // 데이터 공유 동의
      shareData: {
        type: 'boolean',
        default: false,
        description: '개인 데이터 그룹 공유 동의'
      }
    }
  },
  
  // 가입 일시
  joinedAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '그룹 가입 일시'
  },
  
  // 승인 일시
  approvedAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '가입 승인 일시'
  },
  
  // 승인자
  approvedBy: {
    type: 'string',
    nullable: true,
    description: '가입 승인자 사용자 ID'
  },
  
  // 마지막 활동 시간
  lastActiveAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '마지막 활동 시간'
  },
  
  // 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '멤버 정보 마지막 업데이트 시간'
  }
};

// 그룹 편차 설정 스키마
export const GroupDeviationConfigSchema = {
  // 설정 ID
  configId: {
    type: 'string',
    required: true,
    description: '편차 설정 고유 식별자'
  },
  
  // 그룹 ID
  groupId: {
    type: 'string',
    required: true,
    description: '그룹 ID'
  },
  
  // 적용 날짜
  applicableDate: {
    type: 'string',
    format: 'date',
    required: true,
    description: '편차 설정 적용 날짜 (YYYY-MM-DD)'
  },
  
  // 기본 편차값
  defaultDeviation: {
    type: 'number',
    minimum: -1000,
    maximum: 1000,
    required: true,
    description: '기본 칼로리 편차값 (kcal)'
  },
  
  // 편차 배수
  deviationMultiplier: {
    type: 'number',
    minimum: 0.1,
    maximum: 5.0,
    required: true,
    description: '편차 적용 배수'
  },
  
  // 편차 유형
  deviationType: {
    type: 'string',
    enum: ['fixed', 'percentage', 'adaptive'],
    default: 'fixed',
    description: '편차 유형 (fixed: 고정값, percentage: 비율, adaptive: 적응형)'
  },
  
  // 식사별 편차 설정
  mealSpecificDeviations: {
    type: 'object',
    properties: {
      breakfast: {
        type: 'number',
        nullable: true,
        description: '아침 식사 편차값'
      },
      lunch: {
        type: 'number',
        nullable: true,
        description: '점심 식사 편차값'
      },
      dinner: {
        type: 'number',
        nullable: true,
        description: '저녁 식사 편차값'
      },
      snacks: {
        type: 'number',
        nullable: true,
        description: '간식 편차값'
      }
    }
  },
  
  // 설정 활성화 여부
  isActive: {
    type: 'boolean',
    default: true,
    description: '편차 설정 활성화 여부'
  },
  
  // 설정 적용자
  appliedBy: {
    type: 'string',
    required: true,
    description: '편차 설정 적용자 사용자 ID'
  },
  
  // 설정 적용 시간
  appliedAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '편차 설정 적용 시간'
  },
  
  // 설정 만료 시간
  expiresAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '편차 설정 만료 시간'
  },
  
  // 설정 설명
  description: {
    type: 'string',
    nullable: true,
    maxLength: 200,
    description: '편차 설정 설명'
  },
  
  // 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '편차 설정 마지막 업데이트 시간'
  }
};

// 그룹 통계 스키마
export const GroupStatisticsSchema = {
  // 그룹 ID
  groupId: {
    type: 'string',
    required: true,
    description: '그룹 ID'
  },
  
  // 통계 기간
  period: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date',
        required: true,
        description: '통계 시작 날짜'
      },
      endDate: {
        type: 'string',
        format: 'date',
        required: true,
        description: '통계 종료 날짜'
      }
    }
  },
  
  // 멤버 통계
  memberStats: {
    type: 'object',
    properties: {
      totalMembers: {
        type: 'number',
        description: '총 멤버 수'
      },
      activeMembers: {
        type: 'number',
        description: '활성 멤버 수'
      },
      newMembers: {
        type: 'number',
        description: '신규 멤버 수'
      },
      averageAge: {
        type: 'number',
        description: '평균 연령'
      },
      genderDistribution: {
        type: 'object',
        properties: {
          male: {
            type: 'number',
            description: '남성 비율 (%)'
          },
          female: {
            type: 'number',
            description: '여성 비율 (%)'
          },
          other: {
            type: 'number',
            description: '기타 비율 (%)'
          }
        }
      }
    }
  },
  
  // 칼로리 통계
  calorieStats: {
    type: 'object',
    properties: {
      averageCalorieIntake: {
        type: 'number',
        description: '평균 칼로리 섭취량'
      },
      averageSpecificBias: {
        type: 'number',
        description: '평균 특정 편차값'
      },
      totalDeviationApplications: {
        type: 'number',
        description: '총 편차 적용 횟수'
      },
      deviationEffectiveness: {
        type: 'number',
        description: '편차 효과성 점수 (1-10)'
      }
    }
  },
  
  // 활동 통계
  activityStats: {
    type: 'object',
    properties: {
      dailyActiveUsers: {
        type: 'number',
        description: '일일 활성 사용자 수'
      },
      averageSessionDuration: {
        type: 'number',
        description: '평균 세션 지속 시간 (분)'
      },
      totalFoodEntries: {
        type: 'number',
        description: '총 음식 기록 수'
      },
      totalExerciseEntries: {
        type: 'number',
        description: '총 운동 기록 수'
      }
    }
  },
  
  // 마지막 업데이트 시간
  lastUpdatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '통계 마지막 업데이트 시간'
  }
};

// 그룹 유형 열거형
export const GroupTypes = {
  RESEARCH: 'research',
  COMMUNITY: 'community',
  FAMILY: 'family',
  FRIENDS: 'friends',
  WORKPLACE: 'workplace',
  OTHER: 'other'
};

// 그룹 상태 열거형
export const GroupStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended'
};

// 멤버 역할 열거형
export const MemberRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member'
};

// 멤버 상태 열거형
export const MemberStatus = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  LEFT: 'left'
};

// 편차 유형 열거형
export const DeviationTypes = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  ADAPTIVE: 'adaptive'
};

// 기본 그룹 생성 함수
export const createDefaultGroup = (name, createdBy, options = {}) => {
  const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    groupId,
    name,
    description: options.description || null,
    color: options.color || '#3B82F6',
    defaultDeviation: options.defaultDeviation || 0,
    deviationMultiplier: options.deviationMultiplier || 1.0,
    groupType: options.groupType || GroupTypes.COMMUNITY,
    status: GroupStatus.ACTIVE,
    isPublic: options.isPublic || false,
    requiresApproval: options.requiresApproval !== false,
    maxMembers: options.maxMembers || 50,
    currentMemberCount: 1,
    createdBy,
    admins: [createdBy],
    tags: options.tags || [],
    settings: {
      autoApplyDeviation: true,
      allowDataSharing: false,
      showGroupStats: true,
      notifications: {
        newMember: true,
        deviationUpdate: true,
        weeklyReport: false
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString()
  };
};

// 기본 그룹 멤버 생성 함수
export const createDefaultGroupMember = (groupId, uid, role = MemberRoles.MEMBER) => {
  return {
    memberId: `${groupId}_${uid}`,
    groupId,
    uid,
    role,
    status: role === MemberRoles.OWNER ? MemberStatus.ACTIVE : MemberStatus.PENDING,
    nickname: null,
    joinMessage: null,
    personalSettings: {
      applyGroupDeviation: true,
      personalMultiplier: 1.0,
      shareData: false
    },
    joinedAt: new Date().toISOString(),
    approvedAt: role === MemberRoles.OWNER ? new Date().toISOString() : null,
    approvedBy: role === MemberRoles.OWNER ? uid : null,
    lastActiveAt: null,
    updatedAt: new Date().toISOString()
  };
};

// 그룹 편차 설정 생성 함수
export const createGroupDeviationConfig = (groupId, appliedBy, deviationData) => {
  return {
    configId: `config_${groupId}_${Date.now()}`,
    groupId,
    applicableDate: deviationData.applicableDate,
    defaultDeviation: deviationData.defaultDeviation,
    deviationMultiplier: deviationData.deviationMultiplier,
    deviationType: deviationData.deviationType || DeviationTypes.FIXED,
    mealSpecificDeviations: deviationData.mealSpecificDeviations || {},
    isActive: true,
    appliedBy,
    appliedAt: new Date().toISOString(),
    expiresAt: deviationData.expiresAt || null,
    description: deviationData.description || null,
    updatedAt: new Date().toISOString()
  };
};

// 그룹 유효성 검사 함수
export const validateGroup = (group) => {
  const errors = [];
  
  if (!group) {
    errors.push('그룹 정보가 없습니다.');
    return errors;
  }
  
  if (!group.name || typeof group.name !== 'string' || group.name.trim().length === 0) {
    errors.push('그룹 이름이 필요합니다.');
  }
  
  if (group.name && group.name.length > 50) {
    errors.push('그룹 이름은 50자를 초과할 수 없습니다.');
  }
  
  if (!group.createdBy || typeof group.createdBy !== 'string') {
    errors.push('그룹 생성자 정보가 필요합니다.');
  }
  
  if (group.maxMembers && (group.maxMembers < 1 || group.maxMembers > 1000)) {
    errors.push('최대 멤버 수는 1명 이상 1000명 이하여야 합니다.');
  }
  
  if (group.defaultDeviation && (group.defaultDeviation < -1000 || group.defaultDeviation > 1000)) {
    errors.push('기본 편차값은 -1000 ~ 1000 범위여야 합니다.');
  }
  
  if (group.deviationMultiplier && (group.deviationMultiplier < 0.1 || group.deviationMultiplier > 5.0)) {
    errors.push('편차 배수는 0.1 ~ 5.0 범위여야 합니다.');
  }
  
  return errors;
};

// 그룹 멤버 권한 확인 함수
export const checkMemberPermission = (member, requiredRole) => {
  const roleHierarchy = {
    [MemberRoles.MEMBER]: 1,
    [MemberRoles.MODERATOR]: 2,
    [MemberRoles.ADMIN]: 3,
    [MemberRoles.OWNER]: 4
  };
  
  const memberLevel = roleHierarchy[member.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return memberLevel >= requiredLevel && member.status === MemberStatus.ACTIVE;
};