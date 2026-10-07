const box=document.querySelector("#players"),out=document.querySelector("#out");
const esc=s=>s.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g," ");
const slug=s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"player";
function add(n="",t=""){let d=document.createElement("div");d.className="player";d.innerHTML=`<label>Kid's name<input class="n" placeholder="Jimmy"></label><label>Team / unique match text<input class="t" placeholder="XF U9 B17/18 RCL 1"></label><button class="remove">Remove</button>`;d.querySelector(".n").value=n;d.querySelector(".t").value=t;d.querySelectorAll("input").forEach(x=>x.oninput=gen);d.querySelector(".remove").onclick=()=>{if(box.children.length>1){d.remove();gen()}};box.appendChild(d);gen()}
function rows(){return [...box.children].map((d,i)=>{let n=d.querySelector(".n").value.trim()||`Player ${i+1}`;return{name:n,team:d.querySelector(".t").value.trim()||`TEAM NAME ${i+1}`,path:slug(n)}})}
function gen(){let a=rows(),entries=a.map(x=>`  { name: "${esc(x.name)}", match: "${esc(x.team)}", path: "${x.path}" }`).join(",\n");out.textContent=`// EDIT ONLY THIS SECTION
const TEAMS = [
${entries}
];
const OTHERS_PATH = "others";

// YOU SHOULD NOT NEED TO CHANGE ANYTHING BELOW THIS LINE
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestedPath = url.pathname.toLowerCase()
      .replace(/^\\/+|\\/+$/g, "").replace(/\\.ics$/, "");
    const requestedTeam = TEAMS.find(
      team => team.path.toLowerCase() === requestedPath
    );
    const isOthers = requestedPath === OTHERS_PATH.toLowerCase();

    if (!requestedTeam && !isOthers) {
      const calendars = TEAMS.map(
        team => \`/\${team.path}.ics - \${team.name}\`
      ).join("\\n");
      return new Response(
        "Soccer Calendar Splitter\\n\\nAvailable calendars:\\n" +
        calendars + \`\\n/\${OTHERS_PATH}.ics - Other events\\n\`,
        {headers:{"Content-Type":"text/plain; charset=utf-8"}}
      );
    }

    const response = await fetch(env.BYGA_URL, {
      headers: {
        "Accept":"text/calendar,text/plain,*/*",
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15",
        "Accept-Language":"en-US,en;q=0.9"
      },
      redirect:"follow"
    });

    if (!response.ok) {
      const body = await response.text();
      return new Response(
        \`Byga returned HTTP \${response.status}\\n\\nFinal URL: \${response.url}\\n\\nResponse body:\\n\${body}\`,
        {status:502,headers:{"Content-Type":"text/plain; charset=utf-8"}}
      );
    }

    const ics = await response.text();
    const newline = ics.includes("\\r\\n") ? "\\r\\n" : "\\n";
    const eventRegex = /BEGIN:VEVENT[\\s\\S]*?END:VEVENT/g;
    const events = ics.match(eventRegex) || [];

    const filteredEvents = events.filter(event => {
      const unfolded = event.replace(/\\r?\\n[ \\t]/g, "");
      const m = unfolded.match(/^SUMMARY(?:;[^:]*)?:(.*)$/mi);
      const summary = normalize(m ? m[1] : "");
      const matches = TEAMS.filter(team =>
        summary.includes(normalize(team.match))
      );
      if (requestedTeam) return matches.some(
        team => team.path.toLowerCase() === requestedTeam.path.toLowerCase()
      );
      if (isOthers) return matches.length === 0;
      return false;
    });

    let result = ics.replace(eventRegex, "");
    result = result.replace(
      /END:VCALENDAR/i,
      filteredEvents.join(newline) +
      (filteredEvents.length ? newline : "") + "END:VCALENDAR"
    );
    return new Response(result,{headers:{
      "Content-Type":"text/calendar; charset=utf-8",
      "Cache-Control":"no-cache"
    }});
  }
};
function normalize(text) {
  return text.toUpperCase().replace(/\\s+/g," ").trim();
}`;
document.querySelector("#summary").textContent=`${a.length} player feed${a.length==1?"":"s"} + Others`;
document.querySelector("#feeds").innerHTML=a.map(x=>`<code>https://YOUR-WORKER.workers.dev/${x.path}.ics</code>`).join("<br>")+"<br><code>https://YOUR-WORKER.workers.dev/others.ics</code>"}
document.querySelector("#add").onclick=()=>add();document.querySelector("#copy").onclick=async()=>{try{await navigator.clipboard.writeText(out.textContent);document.querySelector("#status").textContent=" ✓ Copied"}catch(e){document.querySelector("#status").textContent=" Select and copy manually"}};add("Jimmy","XF U9 B17/18 RCL 1");add("Fiona","XF U13 G13/14 ECNL");