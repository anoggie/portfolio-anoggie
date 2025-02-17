document.addEventListener("DOMContentLoaded", function () {
    // Criar a barra de progresso
    let progressBar = document.createElement("div");
    progressBar.style.position = "fixed";
    progressBar.style.top = "0";
    progressBar.style.left = "0";
    progressBar.style.width = "0%";
    progressBar.style.height = "5px";
    progressBar.style.backgroundColor = "#ab8dff";
    progressBar.style.zIndex = "9999";
    document.body.appendChild(progressBar);

    // Atualizar a largura da barra de progresso ao rolar
    window.addEventListener("scroll", function () {
        let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        let scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        let progress = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = progress + "%";
    });
});
