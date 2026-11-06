import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Awara Playwright tests',
  output: './allure-report',
  plugins: {
    // singleFile: the report is one index.html that opens with a double-click, without a server.
    awesome: { options: { singleFile: true, reportLanguage: 'en' } },
  },
});
