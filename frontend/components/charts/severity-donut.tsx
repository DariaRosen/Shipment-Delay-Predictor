'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Severity } from '@/types/alerts'

interface SeverityDonutProps {
  data: { severity: Severity; count: number }[]
}

const COLORS = {
  Critical: '#7F1D1D', // Dark red
  High: '#DC2626', // Red
  Medium: '#F59E0B', // Amber
  Low: '#14B8A6', // Teal
  Minimal: '#5EEAD4', // Light teal
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
    const percentage = ((data.value / total) * 100).toFixed(1)
    
    return (
      <div className="bg-white border border-teal-200 rounded-md shadow-lg p-3">
        <p className="font-medium text-teal-900">{data.name}</p>
        <p className="text-sm text-teal-700">
          Count: {data.value}
        </p>
        <p className="text-sm font-semibold text-teal-900">
          {percentage}%
        </p>
      </div>
    )
  }
  return null
}

export const SeverityDonut = ({ data }: SeverityDonutProps) => {
  const total = data.reduce((sum, entry) => sum + entry.count, 0)
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data.map(entry => ({ name: entry.severity, value: entry.count }))}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }: any) => {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : '0'
            return `${name}: ${percentage}%`
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.severity]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          formatter={(value) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

