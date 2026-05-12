/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./*.js", "./components/**/*.js"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2340',
          soft: '#2a3552',
          line: '#d8d4c7',
        },
        accent: {
          DEFAULT: '#b05f3c',
          soft: '#e8d3c4',
        },
        danger: {
          DEFAULT: '#9b2c2c',
          soft: '#f6e6e4',
        },
        success: {
          DEFAULT: '#2f5d3a',
          soft: '#e3ede1',
        },
        warn: {
          DEFAULT: '#8a6a0f',
          soft: '#f3eacb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Times New Roman', 'serif'],
      }
    }
  }
}
