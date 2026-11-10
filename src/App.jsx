import './index.css';

function App() {
  return (
    <div className="min-h-screen flex flex-col font-body">
      {/* Required AAO shared components -- do not remove */}
      <aao-site-header mode="compact" dev-url="https://lab.allaboardohio.org"></aao-site-header>
      <aao-notification
        config-url="https://raw.githubusercontent.com/all-aboard-ohio/aao-lab-components/main/banner.json"
      ></aao-notification>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
        <h1 className="font-heading text-aao-dark-blue text-4xl font-extrabold mb-4">
          Your Tool Name
        </h1>
        <p className="font-body text-gray-600 text-lg">
          Start building here.
        </p>
      </main>

      <footer className="py-6 px-4 text-center font-body text-sm text-gray-400">
        Part of{' '}
        <a href="https://lab.allaboardohio.org" className="text-aao-light-blue hover:underline">
          AAO Data Lab
        </a>
        {' · '}
        <a href="https://allaboardohio.org" className="text-aao-light-blue hover:underline">
          All Aboard Ohio
        </a>
      </footer>
    </div>
  );
}

export default App;
