export function requestSnapshot<T extends object>(client:T|null|undefined,snapshot:unknown):T|null {
 if(!client)return null;if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return client;
 const allowed=["first_name","last_name","father_name","birth_date","gender","nationality","whatsapp_country_code","whatsapp_number","province_id","district_id","neighborhood_id","street","building_number","apartment_number"];
 const values=Object.fromEntries(Object.entries(snapshot).filter(([key,value])=>allowed.includes(key)&&(value===null||typeof value==="string"||typeof value==="number")));
 for(const key of ["province","district","neighborhood"]){const name=(snapshot as Record<string,unknown>)[key+"_name"];if(typeof name==="string")values[key]={name};}
 return {...client,...values};
}
