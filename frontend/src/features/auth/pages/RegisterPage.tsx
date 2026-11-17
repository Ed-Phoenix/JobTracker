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
import { registerSchema, type RegisterValues } from '../schemas'

export function RegisterPage() {
  usePageTitle('Create account')
  const { register: registerUser } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null)
    try {
      await registerUser(values)
    } catch (error) {
      // 400 -> messages next to each input; 409 (email taken) and others -> banner above the form.
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'password']))
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Track every application in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
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
          autoComplete="new-password"
          hint="At least 8 characters, with uppercase, lowercase and a digit."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
