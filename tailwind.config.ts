import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				'dashboard-bg': 'rgb(var(--dashboard-bg))',
				'header-bg': 'rgb(var(--header-bg))',
			},
			borderRadius: {
				lg: 'var(--radius)', // 12px
				md: 'calc(var(--radius) - 2px)', // 10px
				sm: 'calc(var(--radius) - 4px)', // 8px
				xl: 'calc(var(--radius) + 4px)', // 16px
				'2xl': 'calc(var(--radius) + 8px)', // 20px
				'3xl': 'calc(var(--radius) + 12px)', // 24px
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1.2' }],
				'sm': ['0.875rem', { lineHeight: '1.4' }],
				'base': ['1rem', { lineHeight: '1.6' }],
				'lg': ['1.125rem', { lineHeight: '1.6' }],
				'xl': ['1.25rem', { lineHeight: '1.6' }],
				'2xl': ['1.5rem', { lineHeight: '1.4' }],
				'3xl': ['1.875rem', { lineHeight: '1.2' }],
				'4xl': ['2.25rem', { lineHeight: '1.1' }],
				'5xl': ['3rem', { lineHeight: '1' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			},
			boxShadow: {
				'card': 'var(--card-shadow)',
				'card-hover': 'var(--card-shadow-hover)',
				'glow': '0 0 20px rgb(var(--primary) / 0.3)',
				'modern': '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
				'modern-lg': '0 25px 50px -12px rgb(0 0 0 / 0.25), 0 0 0 1px rgb(0 0 0 / 0.05)',
				'inner-modern': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
			},
			backdropBlur: {
				'xs': '2px',
				'lg': '20px',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'from': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'to': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-up': {
					'from': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'to': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'from': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'to': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'bounce-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.3)',
					},
					'50%': {
						opacity: '1',
						transform: 'scale(1.05)',
					},
					'70%': {
						transform: 'scale(0.9)',
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)',
					},
				},
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out forwards',
				'slide-up': 'slide-up 0.6s ease-out forwards',
				'scale-in': 'scale-in 0.3s ease-out forwards',
				'bounce-in': 'bounce-in 0.6s ease-out forwards',
				'shimmer': 'shimmer 2s infinite',
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/forms")({
			strategy: 'class',
		}),
	],
} satisfies Config;