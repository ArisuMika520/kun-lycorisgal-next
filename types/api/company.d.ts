export interface Company {
    id: number
    name: string
    count: number
    alias: string[]
}

export interface CompanyDetail extends Company {
    introduction: string
    created: string | Date
    user: KunUser
}
