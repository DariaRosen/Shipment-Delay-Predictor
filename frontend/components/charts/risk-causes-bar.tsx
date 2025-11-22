'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RiskCausesBarProps {
  data: { reason: string; count: number }[]
}

export const RiskCausesBar = ({ data }: RiskCausesBarProps) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="reason" type="category" width={120} />
        <Tooltip />
        <Bar dataKey="count" fill="#14B8A6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

