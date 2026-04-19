import path from "node:path";

// 永続化する state ファイルの配置先を一元管理する。
export const stateDirectory = path.join(process.cwd(), "state");
export const snapshotFilePath = path.join(stateDirectory, "cat.json");
export const postedFilePath = path.join(stateDirectory, "posted.json");
