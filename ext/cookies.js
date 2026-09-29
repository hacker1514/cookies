chrome.runtime.onMessage.addListener((m,s,sr)=>{
	if(m.a == "e"){
		chrome.cookies.getAll({url:m.u})
		.then(c => {
			sr(c);
		}
		).catch(e => {
			sr(e.message);
		});
	 }
	return true;
});
