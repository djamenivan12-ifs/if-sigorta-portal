import {submitReceipt} from "@/lib/insurance/submitReceipt";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return submitReceipt(request,{id:(await context.params).id});}
