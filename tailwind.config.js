/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { brand: { DEFAULT:"#1E6B3A", light:"#4CB873", pale:"#EAF5ED" } } } },
  plugins: []
}