import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import source from '../../docs/results/competition/metrics.json'
import { Card, ChartContainer, EmptyState, FilterToolbar, PageHeader } from './components'
import { label } from './api'

const policies = [
  { id:'Spending limit', name:'Basic authorization', stroke:'#6c819d', dash:'' },
  { id:'Firewall', name:'Deterministic firewall', stroke:'#088373', dash:'' },
  { id:'Firewall + ML', name:'Conventional ML', stroke:'#bd762f', dash:'8 4' },
  { id:'PRAMITI', name:'Calibrated gate', stroke:'#596cba', dash:'2 4' },
] as const
type Metrics = {
  total: number; nonconforming: number; conformant:number;
  unsafe_approval_rate:number|null; unsafe_approval_count:number; unsafe_approval_ci95:number[]|null;
  human_review_rate:number; false_rejection_rate:number|null; legitimate_approval_rate:number|null;
  median_ms:number; p95_ms:number;
}
type Point={target_review_rate:number;target_review_count:number;methods:Record<string,Metrics>}
const dataset = source as {
  overall:Record<string,Metrics>;matched_review:Point[];by_cohort:Record<string,Record<string,Metrics>>;
  by_family:Record<string,Record<string,Metrics>>;
  scored_set_coverage:Record<string,Record<string,{scored:number;coverage:number|null}>>;
  calibration_sizes:Record<string,number>; training_size:number;
}
const percent=(n:number|null|undefined,digits=1)=>n == null ? 'Unavailable' : (n*100).toFixed(digits)+'%'
const displayInterval=(range:number[]|null)=>range ? range.map(n=>percent(n,2)).join(' to ') : 'Unavailable'
const total = dataset.overall.PRAMITI.total
const unsafe = dataset.overall.PRAMITI.nonconforming
const legitimate = dataset.overall.PRAMITI.conformant

function RiskMetric({ label: title, value, note }: { label:string; value:string; note:string }) {
  return <article className="stat-card research-stat"><p>{title}</p><strong>{value}</strong><small>{note}</small></article>
}

function Frontier() {
  const points=dataset.matched_review
  const [index,setIndex]=useState(0)
  const selected=points[index]
  if (!selected) return <ChartContainer title="Security–autonomy frontier" note="Matched human-review budgets">
    <EmptyState title="No matched review points" description="The recorded experiment contains no comparable review budgets."/>
  </ChartContainer>
  const maxX=Math.max(.1,Math.ceil(Math.max(...points.map(point=>point.target_review_rate))*10)/10)
  const x=(value:number)=>64+550*(value/maxX)
  const y=(value:number)=>193-value*164
  const yTicks=[0,.25,.5,.75,1], xTicks=Array.from({length:5},(_,index)=>maxX*index/4)
  const zeroTie=points.every(point=>policies.slice(1).every(policy=>point.methods[policy.id].unsafe_approval_rate===0))
  const description=zeroTie ? 'The three evidence-aware curves overlap at 0% across the recorded budgets.' :
    'Each line shows the recorded unsafe auto-approval rates at matched review budgets.'
  return <ChartContainer title="Security–autonomy frontier" note="Measured unsafe auto-approval at identical human-review budgets.">
    <div className="frontier-legend" aria-hidden="true">{policies.map(item=><span key={item.id}><i style={{backgroundColor:item.stroke}}/>{item.name}</span>)}</div>
    <div className="chart-scroll" tabIndex={0} role="region" aria-label="Security–autonomy chart">
      <svg className="frontier" viewBox="0 0 640 240" role="img" aria-labelledby="frontier-title frontier-desc">
        <title id="frontier-title">Unsafe auto-approval by human-review rate</title>
        <desc id="frontier-desc">{description} Exact rates appear below.</desc>
        {yTicks.map(tick=><g key={tick}><line x1={64} x2={614} y1={y(tick)} y2={y(tick)} className="chart-grid"/>
          <text x={54} y={y(tick)+4} textAnchor="end">{percent(tick,0)}</text></g>)}
        {xTicks.map(tick=><g key={tick}><line x1={x(tick)} x2={x(tick)} y1={29} y2={193} className="chart-grid"/>
          <text x={x(tick)} y={211} textAnchor="middle">{percent(tick,0)}</text></g>)}
        <text x={338} y={231} textAnchor="middle">Human-review rate · all proposals</text>
        <text x={15} y={110} textAnchor="middle" transform="rotate(-90 15 110)">Unsafe auto-approval rate</text>
        <line x1={x(selected.target_review_rate)} x2={x(selected.target_review_rate)} y1={29} y2={193} className="chart-cursor"/>
        {policies.map(item=>{
          const measured=points.flatMap(point=>{
            const rate=point.methods[item.id].unsafe_approval_rate
            return rate===null ? [] : [{point,rate}]
          })
          return <g key={item.id}>
            <polyline fill="none" stroke={item.stroke} strokeWidth={2.3} strokeDasharray={item.dash}
              points={measured.map(({point,rate})=>x(point.target_review_rate)+','+y(rate)).join(' ')}/>
            {measured.map(({point,rate})=><circle key={point.target_review_count} cx={x(point.target_review_rate)} cy={y(rate)}
              r={point===selected ? 4.7 : 2.8} fill={item.stroke}><title>{item.name} · {percent(rate,2)}</title></circle>)}
          </g>
        })}
      </svg>
    </div>
    <div className="form-stack">
      <FilterToolbar>
        <label className="control">Matched review budget<select value={index} onChange={event=>setIndex(Number(event.target.value))}>
          {points.map((point,i)=><option value={i} key={point.target_review_count}>{percent(point.target_review_rate,2)} · {point.target_review_count}/{total} proposals</option>)}</select></label>
      </FilterToolbar>
      <p className="muted chart-caption">{description} Unsafe auto-approval uses {unsafe.toLocaleString()} unsafe proposals as the denominator.</p>
      <ResultsTable rows={selected.methods} title="Matched review rates"/>
    </div>
  </ChartContainer>
}

function ResultsTable({ rows,title, detail=false }: { rows:Record<string,Metrics>;title:string;detail?:boolean }) {
  return <div className="table-region" role="region" tabIndex={0} aria-label={title}><table className="data-table research-table">
    <caption className="visually-hidden">{title}</caption>
    <thead><tr><th scope="col">Policy</th><th scope="col">Unsafe approvals</th><th scope="col">Human review</th><th scope="col">Legitimate approvals</th>
      {detail && <><th scope="col">False rejection</th><th scope="col">p95 latency</th></>}</tr></thead>
    <tbody>{policies.map(item=>{const sample=rows[item.id];return <tr key={item.id}>
      <th scope="row">{item.name}</th><td>{sample.nonconforming ? percent(sample.unsafe_approval_rate,2) : 'Unavailable'}
        {sample.nonconforming>0 && <small>{sample.unsafe_approval_count}/{sample.nonconforming} · 95% CI {displayInterval(sample.unsafe_approval_ci95)}</small>}</td>
      <td>{percent(sample.human_review_rate)}</td><td>{percent(sample.legitimate_approval_rate)}</td>
      {detail && <><td>{percent(sample.false_rejection_rate)}</td><td>{sample.p95_ms.toFixed(3)} ms<small>Median {sample.median_ms.toFixed(3)} ms</small></td></>}
    </tr>})}</tbody>
  </table></div>
}

export default function Analytics({ initialFamily }: { initialFamily?:string }) {
  const [cohort,setCohort] = useState('Known')
  const [family,setFamily] = useState(initialFamily && dataset.by_family[initialFamily] ? initialFamily : 'concealed_spec_gap')
  return <>
    <PageHeader title="Evaluation analytics" description="Executed experiments on simulated payments, with matched review budgets and explicit denominators."
      context={<p className="eyebrow">Synthetic evaluation</p>} actions={<a download className="btn secondary" href={new URL('../../docs/results/competition/metrics.json',import.meta.url).href}>Download metrics JSON</a>}/>
    <div className="callout neutral"><FlaskConical size={19} aria-hidden="true"/><div><strong>Evidence-aware policy comparison</strong>
      <p>19 Nov 2026 · Class-conditional split conformal verifier, artifact v2 · Alpha 0.10</p></div></div>
    <div className="stats-grid research-stats">
      <RiskMetric label="Test proposals" value={total.toLocaleString()} note={unsafe+' unsafe · '+legitimate+' legitimate'}/>
      <RiskMetric label="Training" value={dataset.training_size.toLocaleString()} note="Disjoint synthetic fixture IDs"/>
      <RiskMetric label="Calibration" value={Object.values(dataset.calibration_sizes).reduce((a,b)=>a+b,0).toLocaleString()} note={dataset.calibration_sizes.conformant+' conformant · '+dataset.calibration_sizes.nonconforming+' nonconforming'}/>
    </div>
    <Frontier/>
    <Card title="Native operating points" note="False rejection and legitimate approval use legitimate proposals. Review uses all proposals. Latency is measured inside policy verification.">
      <ResultsTable rows={dataset.overall} title="Native policy operating points" detail/>
    </Card>
    <div className="investigation-grid">
      <Card title="Known and held-out performance" note="Includes an ambiguous benign substitution cohort.">
        <div className="form-stack"><label className="control">Evaluation cohort<select value={cohort} onChange={event=>setCohort(event.target.value)}>
          {Object.keys(dataset.by_cohort).map(name=><option key={name} value={name}>{name==='Unseen' ? 'Held-out families' : name}</option>)}</select></label>
          <p className="muted">{dataset.by_cohort[cohort].PRAMITI.total} proposals · {dataset.by_cohort[cohort].PRAMITI.nonconforming} unsafe</p>
          <ResultsTable rows={dataset.by_cohort[cohort]} title={'Cohort results · '+cohort}/>
        </div>
      </Card>
      <Card title="Attack-family performance" note="Measured results within the selected synthetic family.">
        <div className="form-stack"><label className="control">Attack family<select value={family} onChange={event=>setFamily(event.target.value)}>
          {Object.keys(dataset.by_family).map(name=><option key={name} value={name}>{label(name)}</option>)}</select></label>
          <p className="muted">{dataset.by_family[family].PRAMITI.total} proposals in this family</p>
          <ResultsTable rows={dataset.by_family[family]} title={'Attack-family results · '+label(family)}/>
        </div>
      </Card>
    </div>
    <Card title="Calibration diagnostics" note="Coverage here is observed only among proposals scored after the firewall.">
      <div className="table-region" tabIndex={0} role="region" aria-label="Calibration diagnostics"><table className="data-table research-table">
        <caption className="visually-hidden">Class-conditional coverage by scored cohort</caption><thead><tr><th scope="col">Cohort</th><th scope="col">Class</th><th scope="col">Scored</th><th scope="col">Observed coverage</th></tr></thead>
        <tbody>{Object.entries(dataset.scored_set_coverage).flatMap(([cohortName,entries])=>Object.entries(entries).map(([name,r])=>
          <tr key={cohortName+name}><th scope="row">{cohortName}</th><td>{name}</td><td>{r.scored}</td><td>{percent(r.coverage,2)}</td></tr>))}</tbody>
      </table></div>
      <div className="callout neutral research-note"><p>Class-conditional validity assumes exchangeability within labels between calibration and future observations. Synthetic templates and evidence provenance can limit generalization. The calibrated gate added native reviews on this corpus. At equal review rates, it showed no incremental safety gain over the evidence-aware firewall.</p></div>
    </Card>
  </>
}
