'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RiskCausesBarProps {
  data: { reason: string; count: number }[]
}

const formatRiskReason = (reason: string) => {
  return reason.replace(/([A-Z])/g, ' $1').trim()
}

export const RiskCausesBar = ({ data }: RiskCausesBarProps) => {
  const formattedData = data.map((item) => ({
    ...item,
    formattedReason: formatRiskReason(item.reason),
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formattedData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="formattedReason" type="category" width={120} />
        <Tooltip />
        <Bar dataKey="count" fill="#14B8A6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

