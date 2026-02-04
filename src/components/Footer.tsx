import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const Footer = () => {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer className="py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
          
          {/* Footer links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a 
              href="mailto:Evenementen@indebuurt.nl" 
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <span className="text-muted-foreground/30">•</span>
            <button 
              onClick={() => setShowTerms(true)}
              className="hover:text-foreground transition-colors"
            >
              Algemene Voorwaarden
            </button>
          </div>
        </div>
      </footer>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Algemene Voorwaarden</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Matchmaker Flori – indebuurt.nl</p>
              <p>Datum: 28 januari 2026</p>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">1. Definities</h3>
                <p>In deze voorwaarden wordt verstaan onder:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Platform:</strong> Matchmaker Flori, onderdeel van indebuurt.nl</li>
                  <li><strong>Gebruiker:</strong> iedere natuurlijke persoon die gebruikmaakt van het Platform</li>
                  <li><strong>Dienst:</strong> het matchen van Gebruikers op basis van door henzelf verstrekte gegevens</li>
                  <li><strong>Persoonsgegevens:</strong> alle gegevens die herleidbaar zijn tot een individuele Gebruiker</li>
                  <li><strong>Verantwoordelijke:</strong> indebuurt.nl B.V., gevestigd in Nederland</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">2. Toepasselijkheid</h3>
                <p>2.1 Deze Algemene Voorwaarden zijn van toepassing op ieder gebruik van het Platform.</p>
                <p>2.2 Door gebruik te maken van Matchmaker Flori verklaart de Gebruiker akkoord te gaan met deze voorwaarden.</p>
                <p>2.3 Indien een bepaling ongeldig blijkt, blijven de overige bepalingen onverminderd van kracht.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">3. Doel van het Platform</h3>
                <p>3.1 Matchmaker Flori biedt een digitale matchmakingdienst waarbij Gebruikers op vrijwillige basis informatie over zichzelf verstrekken.</p>
                <p>3.2 Het doel is het faciliteren van passende ontmoetingen, niet het garanderen van een match of relatie.</p>
                <p>3.3 Matchmaker Flori is geen escort-, datingbureau of bemiddelingsbureau in juridische zin, maar een digitaal matchingplatform.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">4. Gebruikersvoorwaarden</h3>
                <p>4.1 De Gebruiker verklaart:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>minimaal 18 jaar oud te zijn</li>
                  <li>juiste, actuele en volledige informatie te verstrekken</li>
                  <li>het Platform niet te gebruiken voor commerciële, misleidende of schadelijke doeleinden</li>
                </ul>
                <p>4.2 Het is niet toegestaan:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>valse identiteiten te gebruiken</li>
                  <li>gegevens van anderen te uploaden zonder toestemming</li>
                  <li>het Platform te misbruiken, te hacken of te scrapen</li>
                </ul>
                <p>4.3 Matchmaker Flori behoudt zich het recht voor accounts te blokkeren of te verwijderen bij misbruik.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">5. Vertrouwelijkheid & Privacy (kernbepaling)</h3>
                <p><strong>5.1 Extreem vertrouwelijke omgang</strong><br />Alle door Gebruikers verstrekte gegevens worden als strikt vertrouwelijk behandeld.</p>
                <p><strong>5.2 Geen verkoop of doorverkoop</strong><br />Persoonsgegevens worden nooit verkocht, verhuurd of verhandeld aan derden.</p>
                <p><strong>5.3 Geen externe profilering</strong><br />Gegevens worden niet gebruikt voor externe advertentieprofielen, dataverrijking of commerciële targeting buiten indebuurt.nl.</p>
                <p><strong>5.4 Dataminimalisatie</strong><br />Matchmaker Flori verzamelt uitsluitend gegevens die noodzakelijk zijn voor matchmaking en platformfunctionaliteit.</p>
                <p><strong>5.5 Beperkte toegang</strong><br />Toegang tot persoonsgegevens is strikt beperkt tot:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>geautoriseerde medewerkers</li>
                  <li>technische dienstverleners die contractueel gebonden zijn aan geheimhouding</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">6. Verwerking van Persoonsgegevens (AVG)</h3>
                <p>6.1 De verwerking van persoonsgegevens gebeurt conform:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>de Algemene Verordening Gegevensbescherming (AVG/GDPR)</li>
                  <li>Nederlandse privacywetgeving</li>
                </ul>
                <p>6.2 Rechtsgrondslagen:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>expliciete toestemming van de Gebruiker</li>
                  <li>uitvoering van de Dienst</li>
                  <li>wettelijke verplichtingen</li>
                </ul>
                <p>6.3 De Gebruiker heeft recht op:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>inzage</li>
                  <li>correctie</li>
                  <li>verwijdering</li>
                  <li>dataportabiliteit</li>
                  <li>beperking van verwerking</li>
                </ul>
                <p>6.4 Verzoeken kunnen worden ingediend via: privacy@indebuurt.nl</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">7. Databeveiliging</h3>
                <p>7.1 Matchmaker Flori treft passende technische en organisatorische maatregelen, waaronder:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>versleuteling (encryptie)</li>
                  <li>beveiligde servers binnen de EU</li>
                  <li>logging en toegangscontrole</li>
                </ul>
                <p>7.2 Ondanks zorgvuldige beveiliging kan volledige veiligheid nooit worden gegarandeerd. Matchmaker Flori is niet aansprakelijk voor schade door onvoorziene datalekken, tenzij sprake is van grove nalatigheid.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">8. Delen van gegevens tussen Gebruikers</h3>
                <p>8.1 Persoonsgegevens worden alleen gedeeld met andere Gebruikers wanneer de functionaliteit dat vereist, en altijd binnen de context van matchmaking.</p>
                <p>8.2 Contactgegevens worden nooit automatisch gedeeld zonder expliciete actie of toestemming van de Gebruiker.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">9. Aansprakelijkheid</h3>
                <p>9.1 Matchmaker Flori is niet aansprakelijk voor:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>gedrag van andere Gebruikers</li>
                  <li>offline ontmoetingen of gevolgen daarvan</li>
                  <li>emotionele, sociale of relationele schade</li>
                </ul>
                <p>9.2 De Dienst wordt aangeboden op basis van "best effort".</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">10. Duur en beëindiging</h3>
                <p>10.1 De Gebruiker kan het gebruik van het Platform op ieder moment beëindigen.</p>
                <p>10.2 Na beëindiging worden persoonsgegevens binnen een redelijke termijn verwijderd, tenzij wettelijke bewaarplicht geldt.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">11. Wijzigingen</h3>
                <p>11.1 Matchmaker Flori kan deze voorwaarden wijzigen.</p>
                <p>11.2 Wijzigingen worden duidelijk gecommuniceerd via het Platform.</p>
                <p>11.3 Voortgezet gebruik betekent acceptatie van de gewijzigde voorwaarden.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">12. Toepasselijk recht</h3>
                <p>12.1 Op deze voorwaarden is uitsluitend Nederlands recht van toepassing.</p>
                <p>12.2 Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">13. Contact</h3>
                <p>Matchmaker Flori – indebuurt.nl</p>
                <p>E-mail: contact@indebuurt.nl</p>
                <p>Privacy: privacy@indebuurt.nl</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;
