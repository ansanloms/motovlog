// テスト用の声質 (全項目)。character() の voice に渡す値として、lib のテストが
// 共有する (利用側の characters/ には依存しない)。
import type { Voice } from "../src/voice/cache.ts";

export const testVoice: Voice = {
  speaker: 13,
  speed: 1,
  pitch: 0,
  intonation: 1,
  volume: 1,
  pause: 1,
  silenceBefore: 0.1,
  silenceAfter: 0.1,
};
