import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "GPC", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});
