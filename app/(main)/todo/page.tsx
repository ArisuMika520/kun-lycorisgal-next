import { Suspense } from 'react'
import { PublicTodoList } from '~/components/todo/PublicTodoList'

export { metadata } from './metadata'

const TodoListFallback = () => (
  <div className="container mx-auto my-6 space-y-6">
    <div className="flex items-center gap-3">
      <div className="size-6 animate-pulse rounded-full bg-default-200" />
      <div>
        <div className="h-6 w-32 animate-pulse rounded-md bg-default-200" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-default-100" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="space-y-3 rounded-large border border-default-200 p-6"
        >
          <div className="h-5 w-2/3 animate-pulse rounded-md bg-default-100" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-default-100" />
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-default-50" />
        </div>
      ))}
    </div>
  </div>
)

export default function TodoPage() {
  return (
    <Suspense fallback={<TodoListFallback />}>
      <PublicTodoList />
    </Suspense>
  )
}
