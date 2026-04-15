/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f3ea",
        ink: "#20312c",
        moss: "#5b6b52",
        pine: "#31413a",
        clay: "#d7c4aa",
        mist: "#ebf0ea",
        sand: "#efe4d4",
        ember: "#c98c72",
      },
      boxShadow: {
        card: "0 16px 28px rgba(32, 49, 44, 0.08)",
      },
    },
  },
  plugins: [],
};
