function insertNavbar() {
    const navbar = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container">
                <a class="navbar-brand" href="/home.html">
                    <i class="fas fa-robot"></i>
                    Librería IA
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="/home.html">
                                <i class="fas fa-home"></i> Inicio
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/notes.html">
                                <i class="fas fa-list"></i> Crear Lista
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/inventory.html">
                                <i class="fas fa-box-open"></i> Productos (Firebase)
                            </a>
                        </li>
                    </ul>
                    <div class="navbar-nav">
                        <span class="nav-item nav-link" id="userInfo">
                            <i class="fas fa-user"></i> Usuario invitado
                        </span>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Insertar el navbar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navbar);

    // Verificar si hay un usuario logueado
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        // Aquí puedes agregar la lógica para mostrar el usuario actual
        // Por ejemplo, obtener el usuario de localStorage o de una sesión
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            userInfo.innerHTML = `
                <i class="fas fa-user"></i> Hola, ${user.username || user.email}
            `;
        }
    }
} 