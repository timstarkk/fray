type UserMessageProps = {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="bg-indigo-600/80 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[75%]">
        <p className="text-[15px] leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
