export type Category = { slug:string; name:string; count:number };
export type Tool = { slug:string; name:string; category:string; website:string; description:string; priority:number; codes:number };
export type Code = { id:string; tool:string; creator:string; code:string; discount:string; status:'verified'|'to_test'|'pending'; source:string; sourceTitle:string; creatorLink?:string; votes:number; success:number };
export const categories: Category[] = [
 {slug:'hebergement-web',name:'Hébergement web',count:10},{slug:'vpn-et-securite',name:'VPN et sécurité',count:11},{slug:'ia',name:'IA',count:15},{slug:'formation',name:'Formation',count:8},{slug:'e-commerce-et-site',name:'E-commerce et site',count:11},{slug:'creation-et-design',name:'Création et design',count:11},{slug:'outils-createurs',name:'Outils créateurs',count:9},{slug:'finance-et-freelance',name:'Finance et freelance',count:9}
];
export const tools: Tool[] = [
 {slug:'o2switch',name:'o2switch',category:'Hébergement web',website:'https://o2switch.fr',description:'Un hébergement français simple, rapide et sans surprise.',priority:1,codes:1},
 {slug:'nordvpn',name:'NordVPN',category:'VPN et sécurité',website:'https://nordvpn.com',description:'Protège ta connexion et navigue plus sereinement.',priority:1,codes:1},
 {slug:'surfshark',name:'Surfshark',category:'VPN et sécurité',website:'https://surfshark.com',description:'Un VPN accessible pour protéger tous tes appareils.',priority:1,codes:1},
 {slug:'incogni',name:'Incogni',category:'VPN et sécurité',website:'https://incogni.com',description:'Fais retirer tes données personnelles des courtiers.',priority:1,codes:3},
 {slug:'elevenlabs',name:'ElevenLabs',category:'IA',website:'https://elevenlabs.io',description:'Des voix et de l’audio générés par IA.',priority:1,codes:1},
 {slug:'opus-clip',name:'Opus Clip',category:'IA',website:'https://opus.pro',description:'Transforme tes longues vidéos en clips courts.',priority:1,codes:1},
 {slug:'brilliant',name:'Brilliant',category:'Formation',website:'https://brilliant.org',description:'Apprends les maths et les sciences en pratiquant.',priority:1,codes:1},
 {slug:'babbel',name:'Babbel',category:'Formation',website:'https://babbel.com',description:'Progresse dans une nouvelle langue à ton rythme.',priority:1,codes:2},
 {slug:'shopify',name:'Shopify',category:'E-commerce et site',website:'https://shopify.com',description:'Lance et développe ta boutique en ligne.',priority:1,codes:1},
 {slug:'qonto',name:'Qonto',category:'Finance et freelance',website:'https://qonto.com',description:'Le compte pro pensé pour les indépendants.',priority:1,codes:2},
 {slug:'indy',name:'Indy',category:'Finance et freelance',website:'https://indy.fr',description:'Facturation et comptabilité pour indépendants.',priority:1,codes:5},
];
export const codes: Code[] = [
 {id:'o2-akdev',tool:'o2switch',creator:'Antony Klinger',code:'AKDEV10',discount:'-10 %',status:'verified',source:'https://www.youtube.com/watch?v=pLQGHJ0IyPI',sourceTitle:'Quels IA utiliser en 2026 ?',creatorLink:'https://osw.li/akdev',votes:18,success:94},
 {id:'nord-ytstack',tool:'NordVPN',creator:'Tutorial Stack',code:'YTSTACK',discount:'76 % + 4 mois offerts',status:'verified',source:'https://www.youtube.com/watch?v=3qwjTcnZpKA',sourceTitle:'NordVPN Coupon Code 2026',votes:7,success:86},
 {id:'surf-ytstack',tool:'Surfshark',creator:'Tutorial Stack',code:'YTSTACK',discount:'88 % + 4 mois offerts',status:'to_test',source:'https://www.youtube.com/watch?v=AeXhnXT9Xtg',sourceTitle:'Surfshark Coupon Code 2026',votes:14,success:71},
 {id:'incogni-pad',tool:'Incogni',creator:'Phones And Drones',code:'PAD60',discount:'60 % sur l’offre annuelle',status:'verified',source:'https://www.youtube.com/watch?v=qpiMa48N7s0',sourceTitle:"I Tried Incogni... Here's Why It's the BEST",votes:4,success:100},
 {id:'incogni-phil',tool:'Incogni',creator:'Phil Pallen',code:'PHIL60',discount:'60 %',status:'to_test',source:'https://www.youtube.com/watch?v=y6LqYbg18iE',sourceTitle:'Is Incogni Legit? I Tested the Data Removal Service',votes:2,success:0},
 {id:'eleven-jimmy',tool:'ElevenLabs',creator:'AboMalin',code:'JIMMY',discount:'Abonnement moins cher',status:'verified',source:'https://www.youtube.com/watch?v=s97T41BblWw',sourceTitle:"TUTO : Comment avoir l'abonnement ELEVENLABS moins cher ?",votes:5,success:80},
 {id:'opus-joel',tool:'Opus Clip',creator:'Joel Compare',code:'JOEL30',discount:'-30 % en annuel',status:'verified',source:'https://www.youtube.com/watch?v=XoF161wARU4',sourceTitle:'Klap : la vraie alternative à Opus Clip ?',votes:3,success:100},
 {id:'brilliant-mng',tool:'Brilliant',creator:'Chess On Tactics',code:'MNGJG',discount:'Offre partenaire',status:'to_test',source:'https://www.youtube.com/watch?v=vf1JSF6-4pU',sourceTitle:'Brilliant Chess Move',votes:1,success:100},
 {id:'babbel-insight',tool:'Babbel',creator:'Test Prep Insight',code:'INSIGHT10',discount:'-10 %',status:'verified',source:'https://www.youtube.com/watch?v=V13CG47aank',sourceTitle:'Can Babbel Speak ACTUALLY Make You Conversational?',votes:3,success:67},
 {id:'shopify-joe',tool:'Shopify',creator:'Jonathan ecom',code:'JOECOM',discount:'-25 %',status:'verified',source:'https://www.youtube.com/watch?v=CScoKEcH9nI',sourceTitle:"J’ai lancé une boutique Shopify avec Claude IA",votes:9,success:89},
 {id:'qonto-silicon',tool:'Qonto',creator:'Silicon Carne',code:'SILICON3M',discount:'Offre partenaire',status:'verified',source:'https://www.youtube.com/watch?v=PGNRT0Lsy6A',sourceTitle:"L'AFTER : OpenAI défie les maths",votes:3,success:100},
 {id:'indy-yoan',tool:'Indy',creator:"L'entreprise Facile",code:'YOAN',discount:'3 mois offerts',status:'verified',source:'https://www.youtube.com/watch?v=-1-EXltpcrE',sourceTitle:'Indy vs Tiime : quel logiciel choisir ?',votes:6,success:83},
];
export function findTool(slug:string){return tools.find(tool=>tool.slug===slug)}
export function findCode(id:string){return codes.find(code=>code.id===id)}
export function toolCodes(tool:string){return codes.filter(code=>code.tool.toLowerCase()===tool.toLowerCase())}
export function searchTools(query:string){const q=query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s/g,'');return tools.filter(t=>t.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s/g,'').includes(q))}
