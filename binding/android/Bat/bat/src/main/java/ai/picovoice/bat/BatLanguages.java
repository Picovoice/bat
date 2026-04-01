/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.bat;

/**
 * Bat spoken language understanding engine Languages Object.
 */
public enum BatLanguages {
    UNKNOWN(0),
    DE(1),
    EN(2),
    ES(3),
    FR(4),
    IT(5),
    JA(6),
    KO(7),
    PT(8);

    public static final int numLanguages = 9;

    private final int value;

    private BatLanguages(int value) {
        this.value = value;
    }

    public boolean compare(int i){
        return this.value == i;
    }

    public static BatLanguages fromValue(int _value) {
        BatLanguages[] bls = BatLanguages.values();
        for(int i = 0; i < bls.length; i++) {
            if(bls[i].compare(_value))
                return bls[i];
        }
        return BatLanguages.UNKNOWN;
    }
}