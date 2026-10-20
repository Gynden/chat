export default function CreatureArt({ evolved = null, className = "" }: { evolved?: "organic" | "metal" | null; className?: string }) {
  const body = evolved === "metal" ? "#8caaaa" : evolved === "organic" ? "#a6a471" : "#91a87a";
  const shade = evolved === "metal" ? "#456061" : "#4d6b52";
  return <svg className={className} viewBox="0 0 180 150" role="img" aria-label="O Devorador, criatura de musgo com uma grande boca e olhos luminosos" shapeRendering="crispEdges">
    <ellipse cx="89" cy="135" rx="53" ry="8" fill="#000" opacity=".3"/>
    <path d="M42 63H33V44h15V29h15V17h11v25h13V29h16V15h11v22h18v11h14v19h10v44h-14v17h-20v9h-20v-16H75v16H52v-14H37V99H26V77h16Z" fill={shade}/>
    <path d="M48 57V46h16V34h12v20h30V40h17v13h14v16h11v39h-15v12h-27v-9H67v12H48v-18H37V81h11Z" fill={body}/>
    <path d="M51 61h18v-8h35v8h28v14h-9V66H78v9H51Z" fill="#bbc69a"/>
    <path d="M53 78h75v31h-13v8H67v-8H53Z" fill="#253c35"/>
    <path d="M58 79h10v13H58Zm19 0h11v17H77Zm20 0h10v13H97Zm19 0h10v15h-10Z" fill="#e3dab0"/>
    <path d="M72 104h12v-6h22v6h8v10H72Z" fill="#c47e77"/>
    <path d="M57 63h12v9H57Zm53 0h12v9h-12Z" fill="#eaf6b9"/><path d="M61 63h4v9h-4Zm53 0h4v9h-4Z" fill="#40554c"/>
    <path d="M35 92h15v22H39Zm101-4h13v23h-13Z" fill={shade}/><path d="M49 47h12v9H49Zm66-9h13v9h-13ZM45 113h13v8H45Z" fill="#668465"/>
    <path d="M66 21h6v18h-6Zm42-2h5v16h-5Z" fill="#c7d497"/>
    {evolved === "organic" && <path d="M41 36h-8V21h12v16h10v12H41Zm96 2h10V18h-11v10h-8v17h9Z" fill="#be7f72"/>}
    {evolved === "metal" && <><path d="M44 55h22v20H44Zm76 0h20v20h-20ZM70 112h43v8H70Z" fill="#b5c0b5"/><path d="M48 59h5v5h-5Zm77 0h5v5h-5Z" fill="#4d6466"/></>}
    <rect x="27" y="49" width="3" height="3" fill="#d3ef9a" opacity=".6"/><rect x="148" y="37" width="3" height="3" fill="#d3ef9a" opacity=".4"/>
  </svg>;
}
