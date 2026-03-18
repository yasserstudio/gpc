import DefaultTheme from "vitepress/theme";
import "./style.css";
import Layout from "./Layout.vue";
import TerminalDemo from "./TerminalDemo.vue";
import TerminalOutput from "./TerminalOutput.vue";
import CommandHeader from "./CommandHeader.vue";

export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }: { app: import("vue").App }) {
    app.component("TerminalDemo", TerminalDemo);
    app.component("TerminalOutput", TerminalOutput);
    app.component("CommandHeader", CommandHeader);
  },
};
