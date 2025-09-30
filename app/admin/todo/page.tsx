import { Suspense } from 'react'
import { TodoList } from '~/components/admin/todo/Container'
import { kunGetTodoList } from './actions'
import { kunMetadata } from './metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = kunMetadata

export default async function Kun() {
  const todos = await kunGetTodoList()

  return (
    <Suspense>
      <TodoList initialTodos={todos} />
    </Suspense>
  )
}
