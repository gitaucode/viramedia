import { expect,test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const ADMIN_ROUTES=[
  "/admin",
  "/admin/leads",
  "/admin/campaigns",
  "/admin/campaigns/1",
  "/admin/campaigns/1/publishing",
  "/admin/opportunities",
  "/admin/reporting",
  "/admin/clients",
  "/admin/creators",
];
const CLIENT_ROUTES=["/client/login","/client/dashboard","/client/campaigns/1"];
const PORTAL_ROUTES=["/portal/login","/portal/dashboard","/portal/opportunities","/portal/campaigns/1"];
const THEMES=["light","dark"] as const;

const EXPECTED_BG={light:"rgb(246, 246, 242)",dark:"rgb(17, 18, 15)"} as const;
const FORBIDDEN_BG={
  light:new Set(["rgb(9, 9, 9)","rgb(14, 14, 14)","rgb(16, 16, 16)","rgb(17, 17, 17)","rgb(19, 19, 19)","rgb(21, 21, 21)","rgb(22, 22, 22)","rgb(24, 24, 24)"]),
  dark:new Set(["rgb(246, 246, 242)","rgb(255, 255, 255)","rgb(241, 241, 236)","rgb(233, 233, 226)"]),
};

async function setTheme(page:import("@playwright/test").Page,theme:"light"|"dark"){
  await page.addInitScript((value)=>localStorage.setItem("vira-workspace-theme",value),theme);
}

async function adminLogin(page:import("@playwright/test").Page){
  const response=await page.request.post("/api/admin/login",{data:{password:"vira-test-admin-password"}});
  expect(response.ok()).toBeTruthy();
}

async function addPortalCookies(context:import("@playwright/test").BrowserContext){
  await context.addCookies([
    {name:"vira_client",value:"vira-test-client-token",url:"http://127.0.0.1:8788"},
    {name:"vira_creator",value:"vira-test-creator-token",url:"http://127.0.0.1:8788"},
  ]);
}

async function assertWorkspaceContract(page:import("@playwright/test").Page,theme:"light"|"dark",route:string){
  const shell=page.locator(".admin-shell,.client-shell,.portal-shell").first();
  await expect(shell,`${route} must render a shared workspace shell`).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.opsTheme)).toBe(theme);

  const bg=await shell.evaluate((el)=>getComputedStyle(el).backgroundColor);
  expect(bg,`${route} shell background must follow ${theme} theme`).toBe(EXPECTED_BG[theme]);

  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(overflow.scroll,`${route} has horizontal page overflow`).toBeLessThanOrEqual(overflow.client+2);

  const forbidden=await page.evaluate((colors)=>{
    const bad:string[]=[];
    for(const el of Array.from(document.querySelectorAll("body *"))){
      const node=el as HTMLElement;
      const rect=node.getBoundingClientRect();
      if(rect.width<1||rect.height<1)continue;
      const style=getComputedStyle(node);
      if(style.display==="none"||style.visibility==="hidden"||Number(style.opacity)===0)continue;
      if(colors.includes(style.backgroundColor)){
        bad.push(`${node.tagName.toLowerCase()}${node.id?`#${node.id}`:""}${node.className&&typeof node.className==="string"?`.${node.className.trim().replace(/\s+/g,".")}`:""}=${style.backgroundColor}`);
        if(bad.length>=12)break;
      }
    }
    return bad;
  },Array.from(FORBIDDEN_BG[theme]));
  expect(forbidden,`${route} contains legacy neutral surfaces from the opposite theme`).toEqual([]);

  if(route.startsWith("/admin")&&!route.includes("login")){
    await expect(page.locator(".admin-nav").first(),`${route} must use shared admin navigation`).toBeVisible();
    await expect(page.locator(".admin-nav .theme-button").first(),`${route} must expose shared appearance control`).toBeVisible();
  }

  if(route==="/admin/creators"){
    const action=page.getByRole("link",{name:/open campaigns/i});
    await expect(action).toBeVisible();
    const decoration=await action.evaluate((el)=>getComputedStyle(el).textDecorationLine);
    expect(decoration,"Creator Directory secondary action must not fall back to browser-default underline").toBe("none");
  }
}

async function saveScreenshot(page:import("@playwright/test").Page,theme:string,route:string,project:string){
  const dir=path.join("test-results","ui-screenshots",project,theme);
  mkdirSync(dir,{recursive:true});
  const name=(route==="/"?"home":route.replace(/^\//,"").replace(/\//g,"__"))+".png";
  await page.screenshot({path:path.join(dir,name),fullPage:true,animations:"disabled"});
}

for(const theme of THEMES){
  test.describe(`${theme} theme`,()=>{
    for(const route of ADMIN_ROUTES){
      test(`admin ${route}`,async({page},testInfo)=>{
        await setTheme(page,theme);
        await adminLogin(page);
        await page.goto(route,{waitUntil:"networkidle"});
        await assertWorkspaceContract(page,theme,route);
        await saveScreenshot(page,theme,route,testInfo.project.name);
      });
    }

    for(const route of CLIENT_ROUTES){
      test(`client ${route}`,async({page,context},testInfo)=>{
        await setTheme(page,theme);
        await addPortalCookies(context);
        await page.goto(route,{waitUntil:"networkidle"});
        await assertWorkspaceContract(page,theme,route);
        await saveScreenshot(page,theme,route,testInfo.project.name);
      });
    }

    for(const route of PORTAL_ROUTES){
      test(`portal ${route}`,async({page,context},testInfo)=>{
        await setTheme(page,theme);
        await addPortalCookies(context);
        await page.goto(route,{waitUntil:"networkidle"});
        await assertWorkspaceContract(page,theme,route);
        await saveScreenshot(page,theme,route,testInfo.project.name);
      });
    }
  });
}
