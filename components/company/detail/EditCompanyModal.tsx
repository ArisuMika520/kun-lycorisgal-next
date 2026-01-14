'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader
} from '@heroui/modal'
import { Button } from '@heroui/button'
import { Input, Textarea } from '@heroui/input'
import { Chip } from '@heroui/chip'
import { Plus } from 'lucide-react'
import { updateCompanySchema } from '~/validations/company'
import { kunFetchPut } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import toast from 'react-hot-toast'
import type { CompanyDetail } from '~/types/api/company'


type UpdateCompanyData = z.infer<typeof updateCompanySchema>

interface Props {
    company: CompanyDetail
    isOpen: boolean
    onClose: () => void
    onSuccess: (company: CompanyDetail) => void
}

export const EditCompanyModal = ({ company, isOpen, onClose, onSuccess }: Props) => {
    const [input, setInput] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        formState: { errors },
        getValues,
        watch,
        setValue,
        reset
    } = useForm<UpdateCompanyData>({
        resolver: zodResolver(updateCompanySchema),
        defaultValues: {
            companyId: company.id,
            name: company.name,
            introduction: company.introduction || '',
            alias: company.alias || []
        }
    })

    useEffect(() => {
        if (isOpen) {
            reset({
                companyId: company.id,
                name: company.name,
                introduction: company.introduction || '',
                alias: company.alias || []
            })
        }
    }, [isOpen, company, reset])

    const addAlias = () => {
        const alias = input.trim()
        if (!alias) {
            return
        }

        const prevAlias = getValues().alias
        if (!prevAlias?.includes(alias)) {
            setValue('alias', [...prevAlias, alias])
            setInput('')
        } else {
            toast.error('别名已存在, 请更换')
        }
    }

    const handleRemoveAlias = (index: number) => {
        const prevAlias = getValues().alias
        setValue(
            'alias',
            prevAlias?.filter((_, i) => i !== index)
        )
    }

    const handleUpdateCompany = async () => {
        if (input.trim()) {
            addAlias()
        }

        setIsSubmitting(true)

        const res = await kunFetchPut<KunResponse<CompanyDetail>>('/api/company', watch())

        kunErrorHandler(res, (value) => {
            reset()
            toast.success(
                '会社信息编辑成功, 由于缓存影响, 您的更改将在至多 30 秒后生效'
            )
            onSuccess(value)
        })
        setIsSubmitting(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
            <ModalContent>
                <form>
                    <ModalHeader>编辑会社</ModalHeader>
                    <ModalBody>
                        <div className="space-y-6">
                            <Input
                                {...register('name')}
                                label="会社名称"
                                placeholder="输入会社名称"
                                isInvalid={!!errors.name}
                                errorMessage={errors.name?.message}
                            />

                            <Textarea
                                {...register('introduction')}
                                label="会社简介"
                                placeholder="输入会社简介"
                                isInvalid={!!errors.introduction}
                                errorMessage={errors.introduction?.message}
                            />

                            <div className="space-y-2">
                                <div className="flex space-x-2">
                                    <Input
                                        labelPlacement="outside"
                                        label="别名"
                                        placeholder="可以按回车添加别名"
                                        value={input}
                                        onChange={(e) => {
                                            e.preventDefault()
                                            setInput(e.target.value)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addAlias()
                                            }
                                        }}
                                    />
                                    <Button
                                        color="primary"
                                        onPress={addAlias}
                                        className="self-end"
                                        isIconOnly
                                    >
                                        <Plus size={20} />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {watch().alias?.map((alias, index) => (
                                        <Chip
                                            key={index}
                                            onClose={() => handleRemoveAlias(index)}
                                            variant="flat"
                                        >
                                            {alias}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={handleClose}>
                            取消
                        </Button>
                        <Button
                            color="primary"
                            isDisabled={isSubmitting}
                            isLoading={isSubmitting}
                            onPress={handleUpdateCompany}
                        >
                            保存
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    )
}
