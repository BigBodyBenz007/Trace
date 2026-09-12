import fs from "fs";
import path from "path";
import { createHash } from "crypto";

test.each([
  ["ceremony-open.mp4", "fe92072477b430ef5360b50dc8ca2ddd66e78e9333f40545bad16fea94fbdc24"],
  ["ceremony-close.mp4", "a25aad205e5882c1605fb3987c28201e8904e57cb68058e73929441de7f6f8ec"],
])("production %s preserves the exact approved combined film", (name, hash) => {
  const film = fs.readFileSync(path.join(process.cwd(), "src/assets/time-capsule", name));
  expect(createHash("sha256").update(film).digest("hex")).toBe(hash);
});

test.each(["vault-opened.png", "vault-sealed.png"])("%s retains the approved camera frame dimensions", name => {
  const frame = fs.readFileSync(path.join(process.cwd(), "src/assets/time-capsule", name));
  expect(frame.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(frame.readUInt32BE(16)).toBe(960);
  expect(frame.readUInt32BE(20)).toBe(840);
});
