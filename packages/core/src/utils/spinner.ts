import process from "node:process";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

export interface Spinner {
  start(): void;
  stop(message?: string): void;
  fail(message?: string): void;
  update(message: string): void;
}

export function createSpinner(message: string): Spinner {
  const isTTY = process.stderr.isTTY === true;
  let frameIndex = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let currentMessage = message;
  let started = false;

  function clearLine(): void {
    if (isTTY) {
      process.stderr.write("\r\x1b[K");
    }
  }

  function renderFrame(): void {
    const frame = FRAMES[frameIndex % FRAMES.length];
    process.stderr.write(`\r\x1b[K${frame} ${currentMessage}`);
    frameIndex++;
  }

  return {
    start(): void {
      if (started) return;
      started = true;

      if (!isTTY) {
        process.stderr.write(`${currentMessage}\n`);
        return;
      }

      renderFrame();
      timer = setInterval(renderFrame, INTERVAL_MS);
    },

    stop(msg?: string): void {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      const text = msg ?? currentMessage;
      if (isTTY) {
        clearLine();
        process.stderr.write(`\u2714 ${text}\n`);
      } else if (!started) {
        process.stderr.write(`${text}\n`);
      }
      started = false;
    },

    fail(msg?: string): void {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      const text = msg ?? currentMessage;
      if (isTTY) {
        clearLine();
        process.stderr.write(`\u2718 ${text}\n`);
      } else if (!started) {
        process.stderr.write(`${text}\n`);
      }
      started = false;
    },

    update(msg: string): void {
      currentMessage = msg;
      if (!isTTY || !started) return;
      renderFrame();
    },
  };
}
