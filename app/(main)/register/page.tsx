import { kunMetadata } from './metadata'
import { RegisterForm } from '~/components/register/Register'
import { LoginContainer } from '~/components/login/Container'
import type { Metadata } from 'next'

export const metadata: Metadata = kunMetadata

export default function Kun() {
  return (
    <LoginContainer title="注册">
      <RegisterForm />
    </LoginContainer>
  )
}
