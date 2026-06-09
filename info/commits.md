# 최근 커밋 정리

## 커밋 포인트

### 1. `guidance draft` - Guidance 시스템 기초 구현
**주요 변경사항:**
- **Guidance 시스템**: 사용자가 메시지 입력시 자동으로 관련 노드를 감지하는 2단계 시스템
  - Stage 0: 참조된 노드 감지 (LLM) + RAG 검색 (벡터 유사도)
  - Stage 1: 캔버스에 밝은 파란색으로 컨텍스트 노드 표시
  - Stage 2: Send 버튼 클릭시 활성 노드만으로 생성
- **Reference Detection**: Groq LLM이 사용자 메시지에서 명시된 노드ID 감지
- **RAG (Retrieval Augmented Generation)**: Jina AI 임베딩으로 의미적 유사도 검색
- **Grip Level**: Off/Low/Mid/High 레벨로 RAG 필터링 강도 조절 (0.5~0.9 threshold)
- **Snapshot**: 생성 후 자동으로 프롬프트, 참조노드, 추천노드, 활성컨텍스트 저장

### 2. `guidance improved` - Guidance 개선 및 UX 강화
**주요 변경사항:**
- **Auto-focus**: LLM 응답 완료 후 자동으로 입력창 포커스
- **Auto-scroll**: 메시지 송신시 자동으로 채팅 창 스크롤
- **Empty Input 시 Guidance 비활성화**: 입력창이 비어있으면 2초 타이머 및 가이던스 시스템 OFF
- **Custom ConfirmDialog**: 브라우저 confirm() 대신 UI 통합 확인 대화상자 (위험한 작업용 빨간색)
- **Fold Button**: 펼쳐진 노드에 호버시 하얀색 배지 + Minimize2 아이콘으로 폴딩 기능
- **TreeCanvas 개선**: D3.js SVG 렌더링 최적화, 호버 상태 개선

### 3. `new logo` - 새로운 로고 디자인 및 통합
**주요 변경사항:**
- **로고 디자인**: 트리 구조를 반영한 새로운 SVG 로고 (파란색, 곡선 연결)
- **Interactive Logo Designer** (`logo-final.html`):
  - Curve Exaggeration (0-150): 곡선 강도
  - Line Thickness (1-20): 선 두께
  - Tree Height (40-200): 수직 거리
  - Tree Width (20-200): 수평 폭
  - Real-time 프리뷰 + Copy/Reset 버튼
- **로고 통합**:
  - Sidebar 헤더: 32x32 크기로 표시
  - AuthPage: 56x56 크기로 표시
  - GitFork 아이콘 대체

---

## Guidance 시스템 작동 원리

### 3단계 워크플로우

**Stage 0 (백그라운드, 병렬)**
```
사용자 입력 → LLM 참조 노드 감지 + RAG 벡터 검색 (동시 진행)
```

**Stage 1 (시각화, 자동)**
```
캔버스에 다음을 밝은 파란색으로 표시:
- 직계 조상 (루트까지의 경로)
- 참조된 노드 (사용자가 명시)
- 추천된 노드 (RAG 검색 결과)
```

**Stage 2 (생성, Send 버튼)**
```
사용자가 한 번의 Send로 활성 노드만 Groq에 전달
자동으로 스냅샷 저장 (응답, 프롬프트, 컨텍스트 정보)
```

### Grip Threshold (RAG 필터링)

| 레벨 | RAG 활성화 | Min Score | 용도 |
|------|-----------|-----------|------|
| Off | ✗ | N/A | 수동 선택만 |
| Low | ✓ | 0.5 | 넓은 범위 검색 |
| Mid | ✓ | 0.7 | 중간 정도 필터링 |
| High | ✓ | 0.9 | 매우 관련된 노드만 |

### 특징
- **명시적 참조 vs 자동 추천 분리**: LLM이 감지한 참조는 항상 포함, RAG는 Grip으로 조절
- **시각적 컨텍스트 선택**: 체크박스 대신 캔버스에서 노드 클릭으로 비활성화 (밝음 → 흐림)
- **Error Resilience**: 어느 단계가 실패해도 성공한 부분만으로 진행
- **Empty Input 최적화**: 입력이 없으면 불필요한 API 호출 없음

---

## 개선된 UX 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| Auto-focus | ✓ | 응답 완료 후 즉시 입력 가능 |
| Auto-scroll | ✓ | 메시지 송신시 채팅 하단으로 스크롤 |
| Custom Dialogs | ✓ | 삭제/위험 작업에 styled confirm 사용 |
| Fold Hover Button | ✓ | 노드 호버시 접기 버튼 표시 |
| 새 로고 | ✓ | 트리 구조 반영, 사이즈 조정 가능 |
