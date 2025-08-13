import { LoginForm } from '~/components/login/Login'
import { kunMetadata } from './metadata'
import { LoginContainer } from '~/components/login/Container'
import type { Metadata } from 'next'

export const metadata: Metadata = kunMetadata

export default function Kun() {
  return (
    <LoginContainer title="登录">
      <LoginForm />
    </LoginContainer>
  )
}
