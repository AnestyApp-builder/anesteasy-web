'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, X, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'

interface ComparisonRow {
  feature: string
  caderninho: boolean
  excel: 'yes' | 'no' | 'partial'
  appGenerico: 'yes' | 'no' | 'partial'
  anesteasy: boolean
}

const comparisons: ComparisonRow[] = [
  {
    feature: 'Registro rápido (menos de 1 minuto)',
    caderninho: false,
    excel: 'no',
    appGenerico: 'partial',
    anesteasy: true
  },
  {
    feature: 'Integração com secretária',
    caderninho: false,
    excel: 'no',
    appGenerico: 'no',
    anesteasy: true
  },
  {
    feature: 'Lembretes automáticos de cobrança',
    caderninho: false,
    excel: 'no',
    appGenerico: 'partial',
    anesteasy: true
  },
  {
    feature: 'Relatórios financeiros prontos',
    caderninho: false,
    excel: 'partial',
    appGenerico: 'no',
    anesteasy: true
  },
  {
    feature: 'Backup automático e seguro',
    caderninho: false,
    excel: 'partial',
    appGenerico: 'partial',
    anesteasy: true
  },
  {
    feature: 'Acesso de qualquer dispositivo',
    caderninho: false,
    excel: 'partial',
    appGenerico: 'yes',
    anesteasy: true
  },
  {
    feature: 'Funciona offline (salvar sem internet)',
    caderninho: true,
    excel: 'yes',
    appGenerico: 'no',
    anesteasy: false
  },
  {
    feature: 'Terminologia específica para anestesiologistas',
    caderninho: false,
    excel: 'no',
    appGenerico: 'no',
    anesteasy: true
  }
]

const StatusIcon = ({ status }: { status: 'yes' | 'no' | 'partial' | boolean }) => {
  if (status === true || status === 'yes') {
    return <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
  }
  if (status === false || status === 'no') {
    return <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0" />
  }
  return <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-500 flex-shrink-0" />
}

export function ComparisonTable() {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Por Que Trocar o Caderninho ou Planilha pelo AnesteAsy?
          </h2>
          <p className="text-lg sm:text-xl text-slate-600">
            Veja a diferença entre os métodos que anestesiologistas usam hoje
          </p>
        </div>

        {/* Versão Desktop - Tabela */}
        <Card className="shadow-2xl border-0 hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 min-w-[250px]">
                      Funcionalidade
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 min-w-[120px]">
                      Caderninho
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 min-w-[120px]">
                      Excel
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 min-w-[120px]">
                      App Genérico
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-emerald-700 bg-emerald-50 min-w-[120px]">
                      AnesteAsy
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparisons.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusIcon status={row.caderninho} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusIcon status={row.excel} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusIcon status={row.appGenerico} />
                      </td>
                      <td className="px-6 py-4 text-center bg-emerald-50">
                        <StatusIcon status={row.anesteasy} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-emerald-50 p-6 mt-6 rounded-b-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">💡</div>
                  <div>
                    <div className="font-bold text-slate-900">
                      A solução feita especificamente para sua rotina
                    </div>
                    <div className="text-sm text-slate-600">
                      Não é só um app de finanças. É uma ferramenta pensada para anestesiologistas.
                    </div>
                  </div>
                </div>
                <Link href="/register">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3">
                    Testar Grátis por 7 Dias
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Versão Mobile - Carrossel Profissional */}
        <div className="md:hidden">
          <Carousel
            setApi={setApi}
            className="w-full"
            opts={{
              align: "start",
              loop: false,
              dragFree: true,
              containScroll: "trimSnaps",
              slidesToScroll: 1,
            }}
          >
            <CarouselContent className="-ml-2 sm:-ml-3">
              {comparisons.map((row, index) => (
                <CarouselItem key={index} className="pl-2 sm:pl-3 basis-[85%] sm:basis-[80%]">
                  <Card className="border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <CardContent className="p-4 sm:p-5 md:p-6">
                      <h3 className="font-bold text-slate-900 mb-4 sm:mb-5 md:mb-6 text-sm sm:text-base md:text-lg text-center leading-tight px-1">
                        {row.feature}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:bg-slate-100">
                          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 truncate pr-1">Caderninho</span>
                          <StatusIcon status={row.caderninho} />
                        </div>
                        <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:bg-slate-100">
                          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 truncate pr-1">Excel</span>
                          <StatusIcon status={row.excel} />
                        </div>
                        <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:bg-slate-100">
                          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 truncate pr-1">App Genérico</span>
                          <StatusIcon status={row.appGenerico} />
                        </div>
                        <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 shadow-sm transition-colors hover:bg-emerald-100">
                          <span className="text-[10px] sm:text-xs md:text-sm font-bold text-emerald-700 truncate pr-1">AnesteAsy</span>
                          <StatusIcon status={row.anesteasy} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Contador */}
          <div className="mt-6 px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <span className="font-medium">
                {current} de {count}
              </span>
            </div>
          </div>

          {/* CTA Mobile */}
          <Card className="border-0 bg-emerald-50 shadow-md mt-6">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">💡</div>
                <div className="font-bold text-slate-900 mb-1">
                  A solução feita especificamente para sua rotina
                </div>
                <div className="text-sm text-slate-600">
                  Não é só um app de finanças. É uma ferramenta pensada para anestesiologistas.
                </div>
              </div>
              <Link href="/register" className="block">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3">
                  Testar Grátis por 7 Dias
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Legenda */}
        <div className="mt-8 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600 flex-wrap">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Sim / Completo</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-amber-500" />
            <span>Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            <span>Não</span>
          </div>
        </div>
      </div>
    </section>
  )
}

