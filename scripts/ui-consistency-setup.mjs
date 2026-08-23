import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const CONFIG="wrangler.test.jsonc";
const STATE=".wrangler/ui-test-state";

function run(command,args){
  const result=spawnSync(command,args,{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,CI:"true"}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}

rmSync(STATE,{recursive:true,force:true});
run("npx",["wrangler","d1","migrations","apply","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE]);
run("npx",["wrangler","d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--file","scripts/test-seed.sql"]);
run("npx",["wrangler","d1","execute","vira-creators-test","--local","--config",CONFIG,"--persist-to",STATE,"--file","scripts/ui-consistency-seed.sql"]);
console.log("\n✓ UI consistency database prepared in isolated local D1 state");
