import { Card, CardBody, CardHeader } from '@heroui/card'
import { Comments } from '~/components/patch/comment/Comments'

interface Props {
  id: number
}

export const CommentTab = ({ id }: Props) => {
  return (
    <Card className="p-1 sm:p-8">
      <CardHeader className="p-4">
        <h2 className="text-2xl font-medium">游戏评论</h2>
      </CardHeader>
      <CardBody className="p-4">
        <Comments id={Number(id)} />
      </CardBody>
    </Card>
  )
}
