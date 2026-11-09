# 법인세 도식형 압축노트

## 적용 범위

`법인세_전범위_압축회독/part01.html`부터 `part09.html`까지 177개 항목을 작성 데이터로 관리합니다. 교재 순서와 2026.11.1. 판단 기준을 유지합니다.

- 첫 화면: 짧은 이해 설명, 내용에 맞는 비교표·교차표·판단분기·계산순서·기간선, 직접 근거.
- 숫자와 기한은 해당 판단 조건에 붙입니다. 비유는 법정 요건을 대신하지 않습니다.
- 대체 계산법은 같은 단계의 `branches`에, 순차 계산은 `steps`에 둡니다.
- 기존 조문 발췌·상세 설명·기출 보강은 `세부 요건·사례 더 보기`에 보존합니다.
- 기출 50문항, 회독용 YAML, 예상 선지, 읽기 이력 키를 변경하지 않습니다.

## 작성·반영

`part01.json`, `part02-03.json`, `part04-06.json`, `part07-09.json`이 작성 원본입니다. `diagram.type`은 `compare`, `matrix`, `steps`, `decision`, `timeline`입니다. 실제 내용에 맞춰 선택하고 `refs`에 기존 법령·교재 근거를 유지합니다.

```sh
node scripts/corporate-visual-notes/build.cjs
node scripts/corporate-visual-notes/check.cjs
node scripts/corporate-exam-support/check.cjs
node scripts/corporate-visual-notes/ui-check.cjs
```

`jsdom`과 `playwright`가 필요합니다. 저장소에 설치하지 않았다면 기존 의존성 경로를 `NODE_PATH`로 전달합니다. UI 검사는 설치된 Chrome을 사용합니다. URL을 추가하면 동일 검사를 공개 사이트에서 실행합니다.

정적 검사는 개편 전 커밋 `95da3ce4d15c41bc45c47118f6a1b645d704bd93`과 비교하여 원문 전체, 선지 블록, 기출·덱, 읽기 키 보존과 로컬 링크를 확인합니다. UI 검사는 360px 다크 / 1280px 라이트에서 9개 파트의 화면 넘침, 상세 접기, AI 전달 내용, 문제만 풀기, 출처 미리보기, 목차 이동을 확인합니다.

기존 기출 근거 점검의 42/50 수치는 자료에서 근거를 찾을 수 있었던 비율이며 실제 학습자 정답률이나 이번 화면 개편의 성과 측정값이 아닙니다.
