const { Profile } = require("../components/profiles/model");
const { User } = require("../components/users/model");

const { runScript } = require("./utils");

const currentProfiles = [
    {
        "title": "PERFIL_Conteudista",
        "label": "Conteudista",
        "description": "No perfil de Conteudista, os usuários têm acesso e permissão para gerenciar os seguintes módulos:\n\nConteúdos/Treinamentos: Podem criar e editar itens de conteúdo, trilhas de aprendizado, seções, canais e avaliações. Isso inclui a capacidade de desenvolver novos materiais de aprendizado, organizar o conteúdo em trilhas lógicas, segmentar os itens de acordo com os interesses dos usuários e criar avaliações para medir o progresso e o entendimento.\n\nMarketplace: Exploram os conteúdos disponíveis e escolhem quais serão disponibilizados para os alunos.\n\nAtividades: Visualizam os materiais enviados pelos alunos, avaliam e dão retorno sobre as atividades.\n\nTreinamentos Presenciais: Criam cursos presenciais desenvolvendo programas de treinamento, definindo datas e horários, gerenciando inscrições e outras tarefas relacionadas à organização de eventos de aprendizado.\n\nConteudistas desempenham um papel fundamental na criação e gerenciamento de conteúdos educacionais na plataforma, contribuindo para uma experiência de aprendizado rica e envolvente para os alunos."
    },
    {
        "title": "PERFIL_Integrador",
        "description": "Aplicam avaliações de performance sobre as atividades do dia a dia que foram criadas pelo Conteudista, com o propósito de medir se a atuação do colaborador está aderente a função.",
        "label": "Integrador",
    },
    {
        "title": "PERFIL_Analista",
        "description": "No perfil de Analista, os usuários têm acesso aos Dashboards. Isso significa que eles podem visualizar e analisar dados de desempenho, engajamento dos usuários e outras métricas importantes relacionadas ao aprendizado na plataforma. Os dashboards oferecem uma visão abrangente e visualmente atraente das tendências e padrões de uso, permitindo que os analistas tomem decisões.",
        "label": "Analista",
    },
    {
        "title": "PERFIL_Aluno",
        "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
        "label": "Aluno",
    },
    {
        "title": "PERFIL_Instrutor",
        "description": "Gerenciam turmas e atualizam as listas de presenças dos treinamentos presenciais.",
        "label": "Instrutor",
    },
    {
        "title": "PERFIL_Colaborador",
        "description": "Permite a postagem de vídeos e PDFs diretamente na plataforma. Os colaboradores podem compartilhar seus conhecimentos e experiências de forma direta, enriquecendo o ambiente de aprendizado para todos os usuários. Essas postagens podem ser moderadas por Conteudistas, garantindo a qualidade e relevância do conteúdo compartilhado na plataforma. Essa abordagem promove uma cultura de compartilhamento de conhecimento e colaboração, fortalecendo a aprendizagem e o desenvolvimento dentro da organização.",
        "label": "Colaborador",
    },
    {
        "title": "PERFIL_Super_Admin",
        "description": "Gerenciam as permissões dos usuários dentro da plataforma.\nConcedem acesso, modificam e excluem permissões dos usuários, garantindo que cada um tenha os acessos adequados conforme sua função.\n\nGerenciam os métodos de autenticação da plataforma, como SSO, formulários, etc.",
        "label": "Gestor de Acessos",
    },
    {
        "title": "PERFIL_Gestor_Elegibilidade",
        "label": "Gestor de Elegibilidade",
        "description": "Configuram e gerenciam as regras de elegibilidade para os conteúdos da plataforma, estabelecendo quais usuários ou grupos têm permissão para acessar treinamentos, trilhas de aprendizado com base em cargos, departamentos ou níveis de experiência.",
    },
    {
        "title": "PERFIL_Gestor_Engajamento",
        "description": "Gerenciam as interações nos conteúdos, gamificação, feed de notícias, configuração do layout da plataforma educacional.",
        "label": "Gestor de Engajamento"
    },
    {
        "title": "PERFIL_Gestor_Usuario",
        "label": "Gestor de Usuários",
        "description": "Gerenciam o cadastro dos alunos na plataforma, adicionando ou editando perfis de alunos.\n\nVisualizam o histórico de aprendizado dos usuários, acompanham seu progresso, emitem certificado, limpam trackings, emulam usuários, entre outros.",
    },
    {
        "title": "PERFIL_Gestor_Matriz",
        "label": "Gestor de Matriz de Habilidades",
        "description": ""
    },
    {
        "title": "PERFIL_Aplicador_Matriz",
        "label": "Aplicador de Matriz de Habilidades",
        "description": ""
    }
];

const profilesToDelete = ['PERFIL_Colaborador_Livre'];

const profileMap = {
    'PERFIL_Admin': 'PERFIL_Gestor_Elegibilidade',
}

async function actionProfiles() {
    console.time('actionProfiles');
    // Atualiza/Cria perfis
    for await (const profile of currentProfiles) {
        if (profile.title === "PERFIL_Gestor_Elegibilidade") {
            continue;
        }

        await Profile.findOneAndUpdate({ title: profile.title }, profile, { upsert: true });
    }

    // Atualiza Perfil de Admin
    await Profile.findOneAndUpdate({ title: 'PERFIL_Admin' }, currentProfiles.find(p => p.title === 'PERFIL_Gestor_Elegibilidade'));

    // Deleta perfis
    await Profile.deleteMany({ title: { $in: profilesToDelete } });
    console.timeEnd('actionProfiles');
}

async function actionUsers() {
    console.time('actionUsers');
    const users = await User.find({ groupsAD: { $in: Object.keys(profileMap) } });

    for await (const [index, user] of Object.entries(users)) {
        console.log(`Updating user ${Number(index) + 1}/${users.length}`);
        const newGroupAD = user.groupsAD.map(group => profileMap[group] || group);
        await User.findByIdAndUpdate(user._id, { $set: { groupsAD: newGroupAD } });
    }


    await User.updateMany(
        { groupsAD: 'PERFIL_Gestor_Elegibilidade' },
        {
            $addToSet: {
                groupsAD: { $each: ['PERFIL_Gestor_Engajamento', 'PERFIL_Gestor_Usuario'] }
            }
        }
    );
    
    console.timeEnd('actionUsers');
}

async function run() {
    console.log('Normalizing profiles...');
    await actionProfiles();

    console.log('Normalizing users...');
    await actionUsers();

    process.exit(0);
}

runScript(run);