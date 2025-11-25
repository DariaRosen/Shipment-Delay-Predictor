'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RiskReason } from '@/types/alerts'
import { getRiskFactorExplanation } from '@/lib/risk-factor-explanations'

interface RiskCausesBarProps {
  data: { reasonKey: string; label: string; count: number; description?: string }[]
}

export const RiskCausesBar = ({ data }: RiskCausesBarProps) => {
  const formattedData = data.map((item) => {
    const explanation = getRiskFactorExplanation(item.reasonKey as RiskReason)
    const formattedReason = item.label ?? explanation?.name ?? item.reasonKey
    const description = item.description ?? explanation?.description ?? 'Driver for the aggregated risk score.'

    return {
      ...item,
      formattedReason,
      description,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formattedData} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          dataKey="formattedReason"
          type="category"
          width={170}
          tick={{ fontSize: 12, fill: '#0f766e' }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="bg-white border border-teal-200 rounded-md shadow-lg p-3">
                  <p className="font-semibold text-teal-900">{data.formattedReason}</p>
                  <p className="text-xs text-teal-700 mt-1 max-w-xs">
                    {data.description}
                  </p>
                  <p className="text-sm font-semibold text-teal-900 mt-2">
                    Count: {data.count}
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Bar dataKey="count" fill="#14B8A6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

