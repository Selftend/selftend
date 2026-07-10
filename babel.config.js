module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          "react-compiler": {},
          // zustand/middleware (and other ESM deps) ship raw `import.meta`,
          // which is a parse-time SyntaxError in Metro's classic-script
          // bundles (web export white-screens). This polyfills it away.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};
