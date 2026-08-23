import { execFileSync } from "node:child_process";
import process from "node:process";

const banned=[
  "#000","#000000","#090909","#0d0d0d","#0e0e0e","#101010","#111","#111111","#131313","#151515","#161616","#171717","#181818","#191919","#202020","#222","#222222","#242424","#252525","#292929","#2a2a2a","#2b2b2b","#2c2c2c","#2d2d2d","#303030","#333","#333333","#3a3a3a","#fff","#ffffff","#f5f5f0"
];
const workspacePath=/^src\/app\/(admin\/|client\/|portal\/|workspace)/;

function git(args){
  return execFileSync("git",args,{encoding:"utf8"}).trim();
}

function resolveBase(){
  const explicit=process.env.UI_CSS_BASE;
  if(explicit)return explicit;
  const githubBase=process.env.GITHUB_BASE_REF;
  if(githubBase){
    try{return git(["merge-base","origin/"+githubBase,"HEAD"])}catch{}
  }
  try{return git(["rev-parse","HEAD~1"])}catch{return "HEAD"}
}

const base=resolveBase();
const diff=git(["diff","--unified=0",base+"...HEAD","--","src/app/**/*.css","src/app/*.css"]);
if(!diff){
  console.log("✓ Workspace CSS consistency lint: no changed CSS lines");
  process.exit(0);
}

let file="";
const violations=[];
for(const line of diff.split("\n")){
  if(line.startsWith("+++ b/")){
    file=line.slice(6);
    continue;
  }
  if(!file||!workspacePath.test(file)||!line.startsWith("+")||line.startsWith("+++"))continue;
  const source=line.slice(1).toLowerCase();
  for(const token of banned){
    const re=new RegExp(token+"(?![0-9a-f])","i");
    if(re.test(source)){
      violations.push(file+": "+line.slice(1).trim()+"  [use workspace theme token instead of "+token+"]");
    }
  }
}

if(violations.length){
  console.error("\n✗ Workspace CSS consistency lint failed\n");
  console.error("New authenticated workspace CSS must use --app-* theme variables for neutral colors. Semantic brand/status colors remain allowed.\n");
  for(const item of violations)console.error("- "+item);
  process.exit(1);
}

console.log("✓ Workspace CSS consistency lint passed");
