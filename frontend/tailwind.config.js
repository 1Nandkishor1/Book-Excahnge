/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDF0F3",   // cool page background
        ink: "#1E1A33",     // text, deep aubergine ink
        slate2: "#5A6272",  // secondary text
        rule: "#D5DAE1",    // borders and dividers
        stamp: { DEFAULT: "#4A36B0", dark: "#3A2A92", soft: "#E6E2F7" }, // library due-date stamp violet
        pine: "#1F6B4F",    // accepted
        brick: "#A83A2F",   // declined, destructive
        ochre: "#8A5A0B",   // pending
      },
      fontFamily: {
        serif: ["Literata", "Georgia", "serif"],
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.7)" }, "60%": { transform: "scale(1.25)" }, "100%": { transform: "scale(1)" } },
        drawer: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        toast: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        pop: "pop .28s ease-out",
        drawer: "drawer .22s ease-out",
        toast: "toast .2s ease-out",
        fade: "fade .15s ease-out",
      },
    },
  },
  plugins: [],
};
