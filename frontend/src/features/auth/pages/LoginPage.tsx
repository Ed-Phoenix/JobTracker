import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { applyServerErrors } from '@/lib/forms'
import { usePageTitle } from '@/lib/usePageTitle'
import { useAuth } from '../AuthContext'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginValues } from '../schemas'

export function LoginPage() {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  // React Hook Form keeps the inputs uncontrolled (the DOM holds the values), so typing
  // does not re-render the whole form. zodResolver runs the schema on submit.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      await login(values)
      // No navigate() here: once the user is authenticated, PublicOnlyRoute redirects.
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']))
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Keep your job search moving."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* noValidate: our Zod messages replace the browser's built-in validation bubbles. */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
