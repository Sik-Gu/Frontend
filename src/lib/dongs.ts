// 동네 설정용 미리 정한 동 목록.
// 원래는 카카오맵 SDK로 동 이름·좌표를 얻지만(D15) API 키가 없어서, 대학가 동네 몇 곳의 중심 좌표를 넣어 두었다.
// 두 계정을 같은 동으로 설정하면 서로의 공구가 목록(500m·1km)에 보인다.
export interface DongPreset { name: string; label: string; latitude: number; longitude: number; }

export const DONG_PRESETS: DongPreset[] = [
  { name: '흑석동', label: '흑석동 (중앙대)', latitude: 37.5087, longitude: 126.9634 },
  { name: '상도동', label: '상도동 (숭실대)', latitude: 37.4966, longitude: 126.9573 },
  { name: '안암동', label: '안암동 (고려대)', latitude: 37.5864, longitude: 127.0292 },
  { name: '신촌동', label: '신촌동 (연세대)', latitude: 37.5597, longitude: 126.9423 },
  { name: '대학동', label: '대학동 (서울대)', latitude: 37.4704, longitude: 126.9365 },
  { name: '역삼동', label: '역삼동', latitude: 37.5006, longitude: 127.0364 },
];
