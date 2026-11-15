import { z } from 'zod'

// Zod schemas validate the form in the browser and give TypeScript the form's type (z.infer).
// They mirror the FluentValidation rules of the API: the client check is for fast feedback,
// the server check is the one that actually protects the data.

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name.').max(200, 'Name is too long.'),
    email: z.email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(100, 'Password is too long.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[0-9]/, 'Include a digit.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
