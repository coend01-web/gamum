// v2.0: UI text and hidden weighted preferences. No answers are persisted.
window.GAMUM_QUIZ = [
  {
    "id": 1,
    "q": "토요일 약속이 갑자기 취소됐습니다. 첫 반응은?",
    "opts": [
      {
        "text": "야호! 드디어 혼자만의 시간.",
        "weights": {
          "solitude": 3,
          "rest": 2
        }
      },
      {
        "text": "그럼 어디라도 나가볼까?",
        "weights": {
          "experience": 3,
          "movement": 2
        }
      },
      {
        "text": "오랜만에 누군가에게 연락해야지.",
        "weights": {
          "connection": 3,
          "sharing": 2
        }
      },
      {
        "text": "미뤄 둔 책이나 영화를 봐야겠다.",
        "weights": {
          "reflective": 3,
          "learning": 1
        }
      }
    ]
  },
  {
    "id": 2,
    "q": "내 인생에 버튼 하나를 추가할 수 있다면?",
    "opts": [
      {
        "text": "⏸ 일시정지 — 아무것도 안 하고 싶다.",
        "weights": {
          "rest": 3,
          "quiet": 2
        }
      },
      {
        "text": "↩ 되감기 — 그때 그 말을 바꾸고 싶다.",
        "weights": {
          "reconciliation": 3,
          "relationship": 2
        }
      },
      {
        "text": "🧭 길찾기 — 어디로 가야 할지 모르겠다.",
        "weights": {
          "discernment": 3
        }
      },
      {
        "text": "↻ 새로고침 — 뭔가 새롭게 시작하고 싶다.",
        "weights": {
          "renewal": 3
        }
      },
      {
        "text": "🔇 음소거 — 잠시 세상 소리를 끄고 싶다.",
        "weights": {
          "quiet": 3,
          "solitude": 2
        }
      }
    ]
  },
  {
    "id": 3,
    "q": "여행에서 가장 오래 기억에 남는 것은?",
    "opts": [
      {
        "text": "창밖을 보며 아무 말도 하지 않았던 시간.",
        "weights": {
          "quiet": 2,
          "solitude": 2
        }
      },
      {
        "text": "우연히 만난 사람과의 대화.",
        "weights": {
          "connection": 3,
          "sharing": 2
        }
      },
      {
        "text": "처음 알게 된 흥미로운 이야기.",
        "weights": {
          "learning": 3,
          "reflective": 2
        }
      },
      {
        "text": "예상하지 못한 특별한 경험.",
        "weights": {
          "experience": 3,
          "movement": 2
        }
      }
    ]
  },
  {
    "id": 4,
    "q": "영화를 보고 나서 가장 오래 남는 장면은?",
    "opts": [
      {
        "text": "대사 없이 조용히 흘러가는 장면.",
        "weights": {
          "quiet": 3,
          "contemplative": 2
        }
      },
      {
        "text": "멀어졌던 사람들이 다시 만나는 장면.",
        "weights": {
          "reconciliation": 3,
          "relationship": 2
        }
      },
      {
        "text": "주인공이 자신의 길을 결정하는 장면.",
        "weights": {
          "discernment": 3,
          "renewal": 1
        }
      },
      {
        "text": "서로 다른 사람들이 하나가 되는 장면.",
        "weights": {
          "community": 3,
          "sharing": 2
        }
      },
      {
        "text": "평범한 일상을 다르게 보게 하는 장면.",
        "weights": {
          "reflective": 3,
          "renewal": 1
        }
      }
    ]
  },
  {
    "id": 5,
    "q": "마음이 복잡할 때 가장 도움이 되는 것은?",
    "opts": [
      {
        "text": "아무도 나를 건드리지 않는 시간.",
        "weights": {
          "solitude": 3,
          "quiet": 2
        }
      },
      {
        "text": "내 이야기를 끝까지 들어 주는 사람.",
        "weights": {
          "one-on-one": 3,
          "connection": 2
        }
      },
      {
        "text": "생각을 정리해 주는 책이나 좋은 말.",
        "weights": {
          "reflective": 3,
          "learning": 2
        }
      },
      {
        "text": "몸을 움직이거나 새로운 일을 해 보는 것.",
        "weights": {
          "movement": 3,
          "experience": 2
        }
      },
      {
        "text": "음악을 듣거나 함께 노래하는 시간.",
        "weights": {
          "music": 3,
          "community": 1
        }
      }
    ]
  },
  {
    "id": 6,
    "q": "낯선 곳에 도착하면 무엇을 먼저 할까요?",
    "opts": [
      {
        "text": "조용한 곳에 앉아 분위기를 느낀다.",
        "weights": {
          "quiet": 2,
          "solitude": 2
        }
      },
      {
        "text": "사람들과 인사를 나눈다.",
        "weights": {
          "connection": 2,
          "sharing": 2
        }
      },
      {
        "text": "안내문과 일정을 꼼꼼히 읽는다.",
        "weights": {
          "guided": 2,
          "learning": 2
        }
      },
      {
        "text": "주변을 돌아다니며 직접 살펴본다.",
        "weights": {
          "experience": 3,
          "movement": 2
        }
      },
      {
        "text": "누군가 친절히 안내해 주면 좋겠다.",
        "weights": {
          "guided": 3,
          "beginner-friendly": 2
        }
      }
    ]
  },
  {
    "id": 7,
    "q": "하루 동안 휴대전화 알림이 모두 꺼진다면?",
    "opts": [
      {
        "text": "완벽해! 아무도 연락하지 않았으면.",
        "weights": {
          "quiet": 3,
          "solitude": 2
        }
      },
      {
        "text": "가끔은 좋지만 대화도 하고 싶다.",
        "weights": {
          "partial-silence": 3,
          "sharing": 1
        }
      },
      {
        "text": "중요한 연락은 놓치고 싶지 않다.",
        "weights": {
          "flexible": 3
        }
      },
      {
        "text": "차라리 재밌는 활동을 하고 싶다.",
        "weights": {
          "experience": 2,
          "movement": 2
        }
      },
      {
        "text": "누구와 함께 있느냐에 따라 달라질 듯.",
        "weights": {
          "company-sensitive": 2
        }
      }
    ]
  },
  {
    "id": 8,
    "q": "나 자신에게 선물할 수 있다면?",
    "opts": [
      {
        "text": "아무 계획 없는 휴식 시간.",
        "weights": {
          "rest": 3,
          "self-directed": 2
        }
      },
      {
        "text": "마음에 오래 남을 책 한 권.",
        "weights": {
          "reflective": 3,
          "learning": 2
        }
      },
      {
        "text": "진지한 대화를 나누는 저녁.",
        "weights": {
          "connection": 2,
          "one-on-one": 2
        }
      },
      {
        "text": "새로운 세계를 경험할 기회.",
        "weights": {
          "experience": 3,
          "renewal": 1
        }
      },
      {
        "text": "누군가에게 도움이 될 기회.",
        "weights": {
          "service": 3,
          "community": 1
        }
      }
    ]
  },
  {
    "id": 9,
    "q": "나에게 선물할 수 있는 시간은 어느 정도인가요?",
    "opts": [
      {
        "text": "하루 정도.",
        "preference": {
          "duration": "day"
        }
      },
      {
        "text": "주말, 1박 2일.",
        "preference": {
          "duration": "one-night"
        }
      },
      {
        "text": "2~3박도 괜찮아요.",
        "preference": {
          "duration": "two-three-nights"
        }
      },
      {
        "text": "더 긴 시간도 가능해요.",
        "preference": {
          "duration": "long"
        }
      },
      {
        "text": "숙박 없이 참여하고 싶어요.",
        "preference": {
          "duration": "non-residential"
        }
      },
      {
        "text": "아직 일정을 모르겠어요.",
        "preference": {
          "duration": "flexible"
        }
      }
    ]
  },
  {
    "id": 10,
    "q": "이번에는 누구와 떠나고 싶나요?",
    "opts": [
      {
        "text": "혼자.",
        "preference": {
          "company": "solo"
        }
      },
      {
        "text": "친구나 지인과.",
        "preference": {
          "company": "friends"
        }
      },
      {
        "text": "배우자와.",
        "preference": {
          "company": "couple"
        }
      },
      {
        "text": "가족과.",
        "preference": {
          "company": "family"
        }
      },
      {
        "text": "본당·단체와.",
        "preference": {
          "company": "group"
        }
      },
      {
        "text": "아직 정하지 않았어요.",
        "preference": {
          "company": "flexible"
        }
      }
    ]
  }
];
